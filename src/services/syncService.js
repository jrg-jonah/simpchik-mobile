// -------------------------------------------------------
// Sync Service for Simpchik Mobile
// Pushes unsynced SQLite data to Firebase Firestore
// Automatically retries when internet becomes available
// -------------------------------------------------------

import NetInfo from "@react-native-community/netinfo";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db as firestore } from "./firebase";
import { getUnsyncedRows, markAsSynced } from "../database/database";

// Tables to sync and their matching Firestore collection names
const SYNC_CONFIG = [
  { table: "checkins", collection: "checkins" },
  { table: "sales", collection: "sales" },
  { table: "stock_updates", collection: "stock_updates" },
  { table: "tasks", collection: "tasks" },
];

// -------------------------------------------------------
// 1. SYNC ALL TABLES
// Loops through each table, pushes unsynced rows to Firestore
// Returns a summary of what was synced
// -------------------------------------------------------
export async function syncAll() {
  let totalSynced = 0;
  let totalFailed = 0;

  for (const config of SYNC_CONFIG) {
    const result = await syncTable(config.table, config.collection);
    totalSynced += result.synced;
    totalFailed += result.failed;
  }

  if (totalSynced > 0) {
    console.log(`✅ Sync complete: ${totalSynced} records synced`);
  }
  if (totalFailed > 0) {
    console.log(`⚠️ Sync: ${totalFailed} records failed (will retry)`);
  }

  return { synced: totalSynced, failed: totalFailed };
}

// -------------------------------------------------------
// 2. SYNC A SINGLE TABLE
// Fetches unsynced rows, uploads each to Firestore,
// marks as synced on success. Skips failures (retries later).
// -------------------------------------------------------
async function syncTable(tableName, collectionName) {
  let synced = 0;
  let failed = 0;

  try {
    const rows = await getUnsyncedRows(tableName);

    if (rows.length === 0) return { synced, failed };

    console.log(`📤 Syncing ${rows.length} ${tableName}...`);

    for (const row of rows) {
      try {
        // Remove local-only fields before sending to Firestore
        const { id, synced: _synced, ...data } = row;

        // Add server timestamp and local reference ID
        await addDoc(collection(firestore, collectionName), {
          ...data,
          local_id: id,
          synced_at: serverTimestamp(),
        });

        // Mark as synced in SQLite
        await markAsSynced(tableName, id);
        synced++;
      } catch (error) {
        // Row failed — skip it, will retry next sync
        console.warn(`❌ Failed to sync ${tableName} #${row.id}:`, error.message);
        failed++;
      }
    }
  } catch (error) {
    console.error(`❌ Error reading ${tableName}:`, error.message);
  }

  return { synced, failed };
}

// -------------------------------------------------------
// 3. CONNECTIVITY LISTENER
// Watches for internet changes. When phone goes online,
// automatically triggers a sync. Call this ONCE in App.js.
// Returns an unsubscribe function for cleanup.
// -------------------------------------------------------
// Debounce timer to prevent multiple rapid sync triggers
let syncTimeout = null;

export function startAutoSync() {
  const unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      // Debounce: wait 2 seconds before syncing (NetInfo fires multiple times)
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        console.log("🌐 Online — starting sync...");
        syncAll();
      }, 2000);
    } else {
      if (syncTimeout) clearTimeout(syncTimeout);
      console.log("📴 Offline — data saved locally");
    }
  });

  return unsubscribe;
}

// -------------------------------------------------------
// 4. MANUAL SYNC
// Call this when user pulls to refresh or taps "Sync Now"
// Checks connectivity first to avoid wasting time
// -------------------------------------------------------
export async function manualSync() {
  const state = await NetInfo.fetch();

  if (!state.isConnected || !state.isInternetReachable) {
    console.log("📴 No internet — sync skipped");
    return { synced: 0, failed: 0, offline: true };
  }

  return await syncAll();
}
