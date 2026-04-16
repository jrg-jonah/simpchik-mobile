module.exports = {
  // No preset — we mock all native modules ourselves
  // Both jest-expo and react-native presets have compatibility issues
  // with Expo SDK 54 + React 19
  testMatch: ["**/__tests__/**/*.test.js"],
  setupFiles: ["./jest.setup.js"],
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|firebase|@firebase))",
  ],
  collectCoverageFrom: [
    "src/**/*.js",
    "App.js",
    "!src/**/*.test.js",
    "!node_modules/**",
  ],
};
