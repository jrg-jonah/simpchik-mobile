// Firebase configuration for Simpchik Mobile
// Using Firebase JS SDK v12 (modular/tree-shakeable imports)

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// NOTE: Firebase Storage requires Blaze plan — add later when needed
// import { getStorage } from "firebase/storage";

// -------------------------------------------------------
// Firebase config loaded from .env file (never push .env to GitHub)
// Expo automatically loads EXPO_PUBLIC_* variables at build time
// -------------------------------------------------------
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase — this is the core app instance
const app = initializeApp(firebaseConfig);

// Firestore — cloud database for syncing reports, stock counts, etc.
export const db = getFirestore(app);

// Auth — for staff login (supports email/password, anonymous, etc.)
export const auth = getAuth(app);

// Storage — requires Blaze plan, uncomment when upgraded
// export const storage = getStorage(app);

export default app;
