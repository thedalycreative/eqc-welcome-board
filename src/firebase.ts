import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAFB1f3hrr1nPtH_DDG6fkAq_VhkjDUBP4",
  authDomain: "eqc-dashboard-by-25g.firebaseapp.com",
  projectId: "eqc-dashboard-by-25g",
  storageBucket: "eqc-dashboard-by-25g.firebasestorage.app",
  messagingSenderId: "53462073983",
  appId: "1:53462073983:web:865a9336b39e3d4ec7f54a"
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
});
