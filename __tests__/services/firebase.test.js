// -------------------------------------------------------
// Unit Tests — Firebase Configuration
// Verifies Firebase is initialized correctly
// -------------------------------------------------------

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";

describe("Firebase configuration", () => {
  it("initializes Firebase app", () => {
    // Import triggers initialization
    require("../../src/services/firebase");
    expect(initializeApp).toHaveBeenCalledTimes(1);
  });

  it("initializes Firestore", () => {
    require("../../src/services/firebase");
    expect(getFirestore).toHaveBeenCalled();
  });

  it("initializes Auth with AsyncStorage persistence", () => {
    require("../../src/services/firebase");
    expect(initializeAuth).toHaveBeenCalled();
    expect(getReactNativePersistence).toHaveBeenCalled();
  });

  it("uses environment variables for config", () => {
    require("../../src/services/firebase");
    const config = initializeApp.mock.calls[0][0];

    // Config should read from process.env (undefined in test = expected)
    expect(config).toHaveProperty("apiKey");
    expect(config).toHaveProperty("authDomain");
    expect(config).toHaveProperty("projectId");
    expect(config).toHaveProperty("storageBucket");
    expect(config).toHaveProperty("messagingSenderId");
    expect(config).toHaveProperty("appId");
  });
});
