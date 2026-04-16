// -------------------------------------------------------
// Integration Test — Offline-First Sync Flow
// Tests the complete flow: insert → stays unsynced → sync → marked synced
// This verifies database.js and syncService.js work together
// -------------------------------------------------------

import * as SQLite from "expo-sqlite";
import NetInfo from "@react-native-community/netinfo";
import { addDoc } from "firebase/firestore";
import { initDatabase, insertCheckin, getUnsyncedRows } from "../../src/database/database";
import { syncAll, manualSync } from "../../src/services/syncService";

// We need REAL database functions (not mocked) for integration
// but syncService already imports from database, so we mock at the SQLite level
const mockDb = {
  execAsync: jest.fn(),
  runAsync: jest.fn(),
  getAllAsync: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  SQLite.openDatabaseAsync.mockResolvedValue(mockDb);
});

describe("Offline-first sync flow", () => {
  it("full flow: insert offline → sync when online → marked as synced", async () => {
    // STEP 1: Initialize database
    await initDatabase();
    expect(SQLite.openDatabaseAsync).toHaveBeenCalledWith("simpchik.db");

    // STEP 2: Insert a checkin (simulates staff in the field, offline)
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 1 });
    const id = await insertCheckin({
      userId: "staff1",
      location: "Farm B",
      notes: "Chickens fed",
    });
    expect(id).toBe(1);

    // STEP 3: Verify it would show as unsynced
    mockDb.getAllAsync.mockResolvedValue([
      { id: 1, user_id: "staff1", location: "Farm B", notes: "Chickens fed", synced: 0 },
    ]);
    const unsynced = await getUnsyncedRows("checkins");
    expect(unsynced).toHaveLength(1);
    expect(unsynced[0].synced).toBe(0);

    // STEP 4: Phone comes online — sync pushes to Firestore
    // Reset mocks for syncAll (it calls getUnsyncedRows for all 4 tables)
    mockDb.getAllAsync
      .mockResolvedValueOnce([
        { id: 1, user_id: "staff1", location: "Farm B", notes: "Chickens fed", synced: 0 },
      ]) // checkins
      .mockResolvedValueOnce([]) // sales
      .mockResolvedValueOnce([]) // stock_updates
      .mockResolvedValueOnce([]); // tasks

    addDoc.mockResolvedValue({ id: "firestore-doc-1" });

    const result = await syncAll();

    // STEP 5: Verify sync results
    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
    expect(addDoc).toHaveBeenCalledTimes(1);

    // STEP 6: Verify markAsSynced was called
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      "UPDATE checkins SET synced = 1 WHERE id = ?",
      [1]
    );
  });

  it("manual sync skips when offline", async () => {
    NetInfo.fetch.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    });

    const result = await manualSync();

    expect(result.offline).toBe(true);
    expect(addDoc).not.toHaveBeenCalled();
  });

  it("handles mixed success and failure across tables", async () => {
    await initDatabase();

    // Checkins: 1 row succeeds, Sales: 1 row fails
    mockDb.getAllAsync
      .mockResolvedValueOnce([{ id: 1, user_id: "u1", synced: 0 }]) // checkins
      .mockResolvedValueOnce([{ id: 1, user_id: "u1", synced: 0 }]) // sales
      .mockResolvedValueOnce([]) // stock_updates
      .mockResolvedValueOnce([]); // tasks

    addDoc
      .mockResolvedValueOnce({ id: "doc1" }) // checkins succeeds
      .mockRejectedValueOnce(new Error("Firestore quota exceeded")); // sales fails

    const result = await syncAll();

    expect(result.synced).toBe(1);
    expect(result.failed).toBe(1);
  });
});
