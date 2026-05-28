import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase config - safe to expose, this is the public client config.
// Security is enforced by Firestore rules, not by hiding these values.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAFB1f3hrr1nPtH_DDG6fkAq_VhkjDUBP4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "eqc-dashboard-by-25g.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "eqc-dashboard-by-25g",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "eqc-dashboard-by-25g.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "53462073983",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:53462073983:web:865a9336b39e3d4ec7f54a",
};

export const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
});
export const storage = getStorage(app);

export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "Trainer";
