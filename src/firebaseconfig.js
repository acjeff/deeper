import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection ,writeBatch} from "firebase/firestore";

// Firebase configuration (replace with your actual Firebase config)
const firebaseConfig = {
    apiKey: "AIzaSyBSmLbAzrfqtd2k1gSl8dHNdnSiUpeOaYs",
    authDomain: "deeper-fc745.firebaseapp.com",
    databaseURL: "https://deeper-fc745-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "deeper-fc745",
    storageBucket: "deeper-fc745.firebasestorage.app",
    messagingSenderId: "132574676345",
    appId: "1:132574676345:web:19433a404d5bff9c7cdba8",
    measurementId: "G-5FGBQ4V8VX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { auth, db, provider, signInWithPopup, signOut, doc, setDoc, getDoc , getDocs, collection, writeBatch};
