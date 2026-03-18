// Import fungsi dasar Firebase
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// TAMBAHAN: Import SDK untuk Auth dan Firestore
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyA4A-3deL4br7oIqGkNu7Ygi_Z0TJ8eZ-Y",
  authDomain: "rok-management-system.firebaseapp.com",
  projectId: "rok-management-system",
  storageBucket: "rok-management-system.firebasestorage.app",
  messagingSenderId: "101861716542",
  appId: "1:101861716542:web:24e4d257298a692a17d76f",
  measurementId: "G-JNC3YV5HQB"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

// TAMBAHAN: Inisialisasi instance Auth dan Firestore, lalu export
export const auth = getAuth(app);
export const db = getFirestore(app);