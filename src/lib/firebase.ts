import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { initializeFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import rawFirebaseConfig from "../../firebase-applet-config.json";

// Typed interface for our config
interface FirebaseConfig {
    apiKey: string;
    authDomain?: string;
    projectId: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
    databaseURL?: string;
    firestoreDatabaseId?: string;
}

// Helper to resolve the best configuration available
const getFirebaseConfig = () => {
    // 1. Try to get config from environment variables (useful for Vercel/Production deployment)
    try {
        // Individual variables (Standard Vite pattern)
        const apiKey = import.meta.env?.VITE_FIREBASE_API_KEY;
        if (apiKey) {
            console.log("Config loaded from individual VITE_FIREBASE_* environment variables");
            return {
                apiKey: apiKey,
                authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
                projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
                storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
                appId: import.meta.env.VITE_FIREBASE_APP_ID,
                databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
                firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
            };
        }

        // Full JSON string option
        const viteConfig = import.meta.env?.VITE_FIREBASE_CONFIG;
        if (viteConfig) {
            console.log("Config loaded from VITE_FIREBASE_CONFIG (JSON)");
            return JSON.parse(viteConfig);
        }

        // Fallback for check against process.env (some build setups)
        if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_FIREBASE_CONFIG) {
            console.log("Config loaded from NEXT_PUBLIC_FIREBASE_CONFIG (JSON)");
            return JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG);
        }
    } catch (error) {
        console.error("Critical: Could not parse Firebase config from environment variables:", error);
    }

    // 2. Fallback to the local configuration file bootstrapped by AI Studio
    console.log("Config loaded from local firebase-applet-config.json");
    return rawFirebaseConfig;
};

const firebaseConfig = getFirebaseConfig() as FirebaseConfig;

// Validate critical config before proceeding
if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey.includes('remixed')) {
  console.warn("Firebase configuration appears invalid or represents placeholder values. Please ensure set_up_firebase has been run or environment variables are set correctly.");
}

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Use (default) if firestoreDatabaseId is not provided
const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
console.log(`[Firebase Diagnostics] Initializing Firestore.
  Project: ${firebaseConfig.projectId}
  Database: ${databaseId}
  Long Polling: Enabled`);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  // Increase timeout for slow connections often found in preview environments
}, databaseId);

export const storage = getStorage(app);

// CRITICAL: Validate Connection to Firestore on startup
// This helps diagnose "client is offline" errors which are often config related
async function testFirebaseConnection() {
  try {
    // We try to fetch a dummy doc from the server specifically
    // Using getDocFromServer forces a network request bypassing cache
    await getDocFromServer(doc(db, '_diagnostics', 'connection'));
    console.log("[Firebase Diagnostics] Firestore connection test: Success (Server reached)");
  } catch (error: any) {
    if (error.message?.includes('offline') || error.code === 'unavailable') {
      console.error(`[Firebase Diagnostics] Connection Failed: The client is offline or the service is unavailable. 
      Checklist:
      1. Is Firestore enabled in the Firebase Console for project "${firebaseConfig.projectId}"?
      2. Does the Database ID "${databaseId}" exist in your Firestore instances?
      3. Are you using a VPN or network that blocks Firebase domains?`);
    } else if (error.code === 'permission-denied') {
      // Permission denied is actually a good sign - it means we reached the server and rules rejected us!
      console.log("[Firebase Diagnostics] Firestore connection test: Reachable (Server responded with Auth/Rules check)");
    } else {
      console.warn("[Firebase Diagnostics] Unexpected connection test state:", error.code, error.message);
    }
  }
}

testFirebaseConnection();

export const googleProvider = new GoogleAuthProvider();

let isSigningIn = false;
export const loginWithGoogle = async () => {
  if (isSigningIn) {
    console.warn("Sign-in already in progress, ignoring duplicate call.");
    return;
  }
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error.code !== "auth/popup-closed-by-user" && error.code !== "auth/cancelled-popup-request" && error.code !== "auth/popup-blocked") {
      console.error("Error signing in with Google:", error);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    // Use a small delay before reload to avoid Firebase Auth internal assertion errors in some environments
    setTimeout(() => {
      window.location.reload();
    }, 100);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};
