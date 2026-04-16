// -------------------------------------------------------
// Jest Setup — Mocks for native modules
// These modules don't exist in Node.js (they run on the phone)
// so we create fake versions for testing
// -------------------------------------------------------

// Mock react-native core
jest.mock("react-native", () => ({
  StyleSheet: { create: (styles) => styles },
  View: "View",
  Text: "Text",
  ActivityIndicator: "ActivityIndicator",
}));

// Mock expo-status-bar
jest.mock("expo-status-bar", () => ({
  StatusBar: "StatusBar",
}));

// Mock expo-sqlite
jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(),
}));

// Mock @react-native-community/netinfo
jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(),
}));

// Mock @react-native-async-storage/async-storage
jest.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  __esModule: true,
}));

// Mock Firebase
jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(() => ({})),
}));

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(() => "SERVER_TIMESTAMP"),
}));

jest.mock("firebase/auth", () => ({
  initializeAuth: jest.fn(() => ({})),
  getReactNativePersistence: jest.fn(() => ({})),
}));

// Silence console logs during tests (less noise)
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  // Keep error visible for debugging
  error: console.error,
};
