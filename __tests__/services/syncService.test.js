// -------------------------------------------------------
// Unit Tests — Sync Service
// Tests the sync logic, connectivity detection, and retry behavior
// -------------------------------------------------------

import NetInfo from "@react-native-community/netinfo";
import { addDoc } from "firebase/firestore";
import { syncAll, startAutoSync, manualSync } from "../../src/services/syncService";
import { getUnsyncedRows, markAsSynced } from "../../src/database/database";

// Mock the database module
jest.mock("../../src/database/database", () => ({
  getUnsyncedRows: jest.fn(),
  markAsSynced: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// -------------------------------------------------------
// syncAll tests
// -------------------------------------------------------
describe("syncAll", () => {
  it("syncs unsynced rows to Firestore and marks them synced", async () => {
    // Only checkins has unsynced data, rest are empty
    getUnsyncedRows
      .mockResolvedValueOnce([
        { id: 1, user_id: "user1", location: "Farm A", synced: 0 },
      ]) // checkins
      .mockResolvedValueOnce([]) // sales
      .mockResolvedValueOnce([]) // stock_updates
      .mockResolvedValueOnce([]); // tasks

    addDoc.mockResolvedValue({ id: "firebase-doc-1" });

    const result = await syncAll();

    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
    expect(addDoc).toHaveBeenCalledTimes(1);
    expect(markAsSynced).toHaveBeenCalledWith("checkins", 1);
  });

  it("returns zero when nothing to sync", async () => {
    getUnsyncedRows.mockResolvedValue([]);

    const result = await syncAll();

    expect(result.synced).toBe(0);
    expect(result.failed).toBe(0);
    expect(addDoc).not.toHaveBeenCalled();
  });

  it("continues syncing other rows when one fails", async () => {
    getUnsyncedRows
      .mockResolvedValueOnce([
        { id: 1, user_id: "user1", synced: 0 },
        { id: 2, user_id: "user1", synced: 0 },
      ]) // checkins
      .mockResolvedValueOnce([]) // sales
      .mockResolvedValueOnce([]) // stock_updates
      .mockResolvedValueOnce([]); // tasks

    addDoc
      .mockRejectedValueOnce(new Error("Network error")) // first row fails
      .mockResolvedValueOnce({ id: "doc2" }); // second row succeeds

    const result = await syncAll();

    expect(result.synced).toBe(1);
    expect(result.failed).toBe(1);
    // Only the successful row gets marked
    expect(markAsSynced).toHaveBeenCalledWith("checkins", 2);
    expect(markAsSynced).not.toHaveBeenCalledWith("checkins", 1);
  });

  it("does not send local-only fields (id, synced) to Firestore", async () => {
    getUnsyncedRows
      .mockResolvedValueOnce([
        { id: 1, user_id: "user1", location: "Farm A", notes: "ok", synced: 0 },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    addDoc.mockResolvedValue({ id: "doc1" });

    await syncAll();

    // Check the data sent to addDoc does NOT contain id or synced
    const sentData = addDoc.mock.calls[0][1];
    expect(sentData).not.toHaveProperty("synced");
    expect(sentData).toHaveProperty("local_id", 1);
    expect(sentData).toHaveProperty("user_id", "user1");
    expect(sentData).toHaveProperty("synced_at", "SERVER_TIMESTAMP");
  });

  it("syncs across multiple tables", async () => {
    getUnsyncedRows
      .mockResolvedValueOnce([{ id: 1, user_id: "u1", synced: 0 }]) // checkins
      .mockResolvedValueOnce([{ id: 1, user_id: "u1", synced: 0 }]) // sales
      .mockResolvedValueOnce([]) // stock_updates
      .mockResolvedValueOnce([{ id: 1, user_id: "u1", synced: 0 }]); // tasks

    addDoc.mockResolvedValue({ id: "doc" });

    const result = await syncAll();

    expect(result.synced).toBe(3);
    expect(addDoc).toHaveBeenCalledTimes(3);
  });
});

// -------------------------------------------------------
// startAutoSync tests
// -------------------------------------------------------
describe("startAutoSync", () => {
  it("registers a NetInfo listener and returns unsubscribe", () => {
    const mockUnsubscribe = jest.fn();
    NetInfo.addEventListener.mockReturnValue(mockUnsubscribe);

    const unsubscribe = startAutoSync();

    expect(NetInfo.addEventListener).toHaveBeenCalled();
    expect(unsubscribe).toBe(mockUnsubscribe);
  });

  it("triggers sync when connectivity changes to online (debounced)", async () => {
    let capturedCallback;
    NetInfo.addEventListener.mockImplementation((callback) => {
      capturedCallback = callback;
      return jest.fn();
    });

    getUnsyncedRows.mockResolvedValue([]);
    startAutoSync();

    // Simulate going online
    capturedCallback({ isConnected: true, isInternetReachable: true });

    // Sync should NOT fire immediately (debounced)
    expect(getUnsyncedRows).not.toHaveBeenCalled();

    // Fast-forward 2 seconds
    jest.advanceTimersByTime(2000);

    // Now allow promises to resolve
    await Promise.resolve();

    expect(getUnsyncedRows).toHaveBeenCalled();
  });

  it("does not trigger sync when offline", () => {
    let capturedCallback;
    NetInfo.addEventListener.mockImplementation((callback) => {
      capturedCallback = callback;
      return jest.fn();
    });

    startAutoSync();
    capturedCallback({ isConnected: false, isInternetReachable: false });

    jest.advanceTimersByTime(2000);

    expect(getUnsyncedRows).not.toHaveBeenCalled();
  });
});

// -------------------------------------------------------
// manualSync tests
// -------------------------------------------------------
describe("manualSync", () => {
  it("syncs when online", async () => {
    NetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
    getUnsyncedRows.mockResolvedValue([]);

    const result = await manualSync();

    expect(result.synced).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("returns offline flag when no internet", async () => {
    NetInfo.fetch.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    });

    const result = await manualSync();

    expect(result).toEqual({ synced: 0, failed: 0, offline: true });
    expect(getUnsyncedRows).not.toHaveBeenCalled();
  });
});
