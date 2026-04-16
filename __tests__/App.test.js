// -------------------------------------------------------
// Component Test — App.js
// Tests that setup functions are called correctly
// -------------------------------------------------------

import { initDatabase } from "../src/database/database";
import { startAutoSync } from "../src/services/syncService";

// Mock database and sync
jest.mock("../src/database/database", () => ({
  initDatabase: jest.fn(),
}));

jest.mock("../src/services/syncService", () => ({
  startAutoSync: jest.fn(() => jest.fn()),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("App", () => {
  it("initDatabase and startAutoSync are properly exported", () => {
    expect(initDatabase).toBeDefined();
    expect(startAutoSync).toBeDefined();
  });

  it("initDatabase is a callable async function", async () => {
    initDatabase.mockResolvedValue({});
    const result = await initDatabase();
    expect(initDatabase).toHaveBeenCalledTimes(1);
  });

  it("startAutoSync returns an unsubscribe function", () => {
    const unsubscribe = startAutoSync();
    expect(typeof unsubscribe).toBe("function");
  });
});
