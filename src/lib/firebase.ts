import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required env var: ${name}. Set it in your environment before building.`);
  }
  return value;
}

const firebaseConfig = {
  apiKey: required("VITE_FIREBASE_API_KEY", import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: required("VITE_FIREBASE_AUTH_DOMAIN", import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: required("VITE_FIREBASE_PROJECT_ID", import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: required("VITE_FIREBASE_STORAGE_BUCKET", import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: required("VITE_FIREBASE_MESSAGING_SENDER_ID", import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: required("VITE_FIREBASE_APP_ID", import.meta.env.VITE_FIREBASE_APP_ID),
};

export const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
});
export const storage = getStorage(app);

export const ADMIN_PASSWORD = required("VITE_ADMIN_PASSWORD", import.meta.env.VITE_ADMIN_PASSWORD);
