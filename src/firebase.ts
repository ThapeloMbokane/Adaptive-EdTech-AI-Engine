import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Config parsed directly from firebase-applet-config.json for maximum reliability
const firebaseConfig = {
  apiKey: "AIzaSyAu1cv5encwC5GxHeJk55psM3L5T8r2jGA",
  authDomain: "community-day26jnb-3056.firebaseapp.com",
  projectId: "community-day26jnb-3056",
  storageBucket: "community-day26jnb-3056.firebasestorage.app",
  messagingSenderId: "103576107801",
  appId: "1:103576107801:web:a861d9986996d6d4962388"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
