import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDwUH8IqVBXtg8uuVHOuU7MxiVdqIw-QYM",
  authDomain: "vibecines-app.firebaseapp.com",
  projectId: "vibecines-app",
  storageBucket: "vibecines-app.firebasestorage.app",
  messagingSenderId: "1089461851931",
  appId: "1:1089461851931:web:0c6c6bc6df7bb6930de5be"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const ADMIN_EMAIL = 'admin@vibecines.com';

