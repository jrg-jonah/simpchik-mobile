// -------------------------------------------------------
// Unit Tests — Database Service
// Tests that SQLite operations work correctly
// -------------------------------------------------------

import * as SQLite from "expo-sqlite";
import {
  initDatabase,
  insertCheckin,
  insertSale,
  insertStockUpdate,
  insertTask,
  getCheckins,
  getSales,
  getStockUpdates,
  getTasks,
  getUnsyncedRows,
  markAsSynced,
} from "../../src/database/database";

// -------------------------------------------------------
// Create a fake database that behaves like expo-sqlite
// -------------------------------------------------------
const mockDb = {
  execAsync: jest.fn(),
  runAsync: jest.fn(),
  getAllAsync: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  SQLite.openDatabaseAsync.mockResolvedValue(mockDb);
});

// -------------------------------------------------------
// initDatabase tests
// -------------------------------------------------------
describe("initDatabase", () => {
  it("opens the database with correct name", async () => {
    await initDatabase();
    expect(SQLite.openDatabaseAsync).toHaveBeenCalledWith("simpchik.db");
  });

  it("enables WAL mode", async () => {
    await initDatabase();
    expect(mockDb.execAsync).toHaveBeenCalledWith(
      "PRAGMA journal_mode = WAL;"
    );
  });

  it("creates all four tables", async () => {
    await initDatabase();
    // Second call to execAsync is the CREATE TABLE statements
    const createTableSQL = mockDb.execAsync.mock.calls[1][0];
    expect(createTableSQL).toContain("CREATE TABLE IF NOT EXISTS checkins");
    expect(createTableSQL).toContain("CREATE TABLE IF NOT EXISTS sales");
    expect(createTableSQL).toContain("CREATE TABLE IF NOT EXISTS stock_updates");
    expect(createTableSQL).toContain("CREATE TABLE IF NOT EXISTS tasks");
  });

  it("all tables have a synced column", async () => {
    await initDatabase();
    const createTableSQL = mockDb.execAsync.mock.calls[1][0];
    // Count occurrences of "synced INTEGER DEFAULT 0"
    const matches = createTableSQL.match(/synced INTEGER DEFAULT 0/g);
    expect(matches).toHaveLength(4);
  });
});

// -------------------------------------------------------
// Insert function tests
// -------------------------------------------------------
describe("Insert functions", () => {
  beforeEach(async () => {
    await initDatabase();
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 1 });
  });

  it("insertCheckin saves correct data", async () => {
    const id = await insertCheckin({
      userId: "user1",
      location: "Farm A",
      notes: "All good",
    });

    expect(id).toBe(1);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      "INSERT INTO checkins (user_id, location, notes) VALUES (?, ?, ?)",
      ["user1", "Farm A", "All good"]
    );
  });

  it("insertSale saves correct data", async () => {
    const id = await insertSale({
      userId: "user1",
      product: "Eggs",
      quantity: 30,
      unit: "tray",
      price: 5.0,
      customer: "John",
    });

    expect(id).toBe(1);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      "INSERT INTO sales (user_id, product, quantity, unit, price, customer) VALUES (?, ?, ?, ?, ?, ?)",
      ["user1", "Eggs", 30, "tray", 5.0, "John"]
    );
  });

  it("insertStockUpdate saves correct data", async () => {
    const id = await insertStockUpdate({
      userId: "user1",
      item: "Feed",
      quantity: 100,
      unit: "kg",
      updateType: "added",
      notes: "New delivery",
    });

    expect(id).toBe(1);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      "INSERT INTO stock_updates (user_id, item, quantity, unit, update_type, notes) VALUES (?, ?, ?, ?, ?, ?)",
      ["user1", "Feed", 100, "kg", "added", "New delivery"]
    );
  });

  it("insertTask saves correct data", async () => {
    const id = await insertTask({
      userId: "user1",
      title: "Fix fence",
      description: "North side broken",
      dueDate: "2026-04-20",
    });

    expect(id).toBe(1);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      "INSERT INTO tasks (user_id, title, description, due_date) VALUES (?, ?, ?, ?)",
      ["user1", "Fix fence", "North side broken", "2026-04-20"]
    );
  });
});

// -------------------------------------------------------
// Fetch function tests
// -------------------------------------------------------
describe("Fetch functions", () => {
  beforeEach(async () => {
    await initDatabase();
  });

  it("getCheckins fetches by user_id ordered by date", async () => {
    const mockRows = [{ id: 2 }, { id: 1 }];
    mockDb.getAllAsync.mockResolvedValue(mockRows);

    const result = await getCheckins("user1");

    expect(result).toEqual(mockRows);
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      "SELECT * FROM checkins WHERE user_id = ? ORDER BY created_at DESC",
      ["user1"]
    );
  });

  it("getSales fetches by user_id", async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    await getSales("user1");
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      "SELECT * FROM sales WHERE user_id = ? ORDER BY created_at DESC",
      ["user1"]
    );
  });

  it("getStockUpdates fetches by user_id", async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    await getStockUpdates("user1");
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      "SELECT * FROM stock_updates WHERE user_id = ? ORDER BY created_at DESC",
      ["user1"]
    );
  });

  it("getTasks fetches by user_id", async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    await getTasks("user1");
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      "SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC",
      ["user1"]
    );
  });
});

// -------------------------------------------------------
// Sync helper tests
// -------------------------------------------------------
describe("Sync helpers", () => {
  beforeEach(async () => {
    await initDatabase();
  });

  it("getUnsyncedRows returns rows where synced = 0", async () => {
    const unsyncedRows = [
      { id: 1, synced: 0 },
      { id: 3, synced: 0 },
    ];
    mockDb.getAllAsync.mockResolvedValue(unsyncedRows);

    const result = await getUnsyncedRows("checkins");

    expect(result).toEqual(unsyncedRows);
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      "SELECT * FROM checkins WHERE synced = 0"
    );
  });

  it("markAsSynced updates the correct row", async () => {
    await markAsSynced("sales", 5);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      "UPDATE sales SET synced = 1 WHERE id = ?",
      [5]
    );
  });
});

// -------------------------------------------------------
// Error handling
// -------------------------------------------------------
describe("Error handling", () => {
  it("throws if database not initialized", async () => {
    // Reset the module to clear the db instance
    jest.resetModules();
    const freshDb = require("../../src/database/database");

    await expect(freshDb.insertCheckin({ userId: "user1" })).rejects.toThrow(
      "Database not initialized"
    );
  });
});
