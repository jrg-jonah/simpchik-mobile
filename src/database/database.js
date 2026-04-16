// -------------------------------------------------------
// SQLite Database Service for Simpchik Mobile
// This is the LOCAL database — all data is saved here FIRST
// Then synced to Firebase when internet is available
// -------------------------------------------------------

import * as SQLite from "expo-sqlite";

// Database instance (singleton)
let db = null;

// -------------------------------------------------------
// 1. INITIALIZE DATABASE
// Opens the database and creates all tables if they don't exist
// Call this ONCE when the app starts (in App.js)
// -------------------------------------------------------
export async function initDatabase() {
  db = await SQLite.openDatabaseAsync("simpchik.db");

  // Enable WAL mode for better performance (recommended for mobile)
  await db.execAsync("PRAGMA journal_mode = WAL;");

  // Create all tables
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      location TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      product TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      price REAL NOT NULL,
      customer TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS stock_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      item TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      update_type TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      due_date TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      synced INTEGER DEFAULT 0
    );
  `);

  console.log("✅ Database initialized");
  return db;
}

// -------------------------------------------------------
// Helper: get the database instance
// -------------------------------------------------------
function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

// -------------------------------------------------------
// 2. INSERT FUNCTIONS
// Save data locally — always sets synced = 0
// -------------------------------------------------------

export async function insertCheckin({ userId, location, notes }) {
  const result = await getDb().runAsync(
    "INSERT INTO checkins (user_id, location, notes) VALUES (?, ?, ?)",
    [userId, location, notes]
  );
  return result.lastInsertRowId;
}

export async function insertSale({ userId, product, quantity, unit, price, customer }) {
  const result = await getDb().runAsync(
    "INSERT INTO sales (user_id, product, quantity, unit, price, customer) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, product, quantity, unit, price, customer]
  );
  return result.lastInsertRowId;
}

export async function insertStockUpdate({ userId, item, quantity, unit, updateType, notes }) {
  const result = await getDb().runAsync(
    "INSERT INTO stock_updates (user_id, item, quantity, unit, update_type, notes) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, item, quantity, unit, updateType, notes]
  );
  return result.lastInsertRowId;
}

export async function insertTask({ userId, title, description, dueDate }) {
  const result = await getDb().runAsync(
    "INSERT INTO tasks (user_id, title, description, due_date) VALUES (?, ?, ?, ?)",
    [userId, title, description, dueDate]
  );
  return result.lastInsertRowId;
}

// -------------------------------------------------------
// 3. FETCH FUNCTIONS
// Read data from local database
// -------------------------------------------------------

export async function getCheckins(userId) {
  return await getDb().getAllAsync(
    "SELECT * FROM checkins WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
}

export async function getSales(userId) {
  return await getDb().getAllAsync(
    "SELECT * FROM sales WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
}

export async function getStockUpdates(userId) {
  return await getDb().getAllAsync(
    "SELECT * FROM stock_updates WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
}

export async function getTasks(userId) {
  return await getDb().getAllAsync(
    "SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
}

// -------------------------------------------------------
// 4. SYNC HELPERS
// These are used by the sync service to find unsynced data
// and mark it as synced after uploading to Firebase
// -------------------------------------------------------

// Get all unsynced rows from a table
export async function getUnsyncedRows(table) {
  return await getDb().getAllAsync(
    `SELECT * FROM ${table} WHERE synced = 0`
  );
}

// Mark a row as synced after successful Firebase upload
export async function markAsSynced(table, id) {
  await getDb().runAsync(
    `UPDATE ${table} SET synced = 1 WHERE id = ?`,
    [id]
  );
}
