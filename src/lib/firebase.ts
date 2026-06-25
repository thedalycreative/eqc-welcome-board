import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase Web SDK config.
//
// These values are NOT secret. The Firebase web config is designed to be
// public — it ships in the client bundle that every visitor downloads, so it
// cannot be hidden. Security is enforced by Firestore/Storage rules and (in
// the Google Cloud console) by HTTP-referrer + API restrictions on the key,
// NOT by keeping these strings out of the source.
//
// Env vars override the defaults so a fork can point at a different project
// without code changes, but the app still boots if they are absent.
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

// The admin password IS a real secret and has no fallback. When it is unset
// the admin panel stays locked (the login rejects every attempt) but the
// public lobby still renders. Set VITE_ADMIN_PASSWORD in the environment to
// enable admin access.
export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "";
