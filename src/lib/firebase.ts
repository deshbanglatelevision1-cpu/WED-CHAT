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
    // 1. Start with the local config as the base truth for AI Studio apps
    // This file is bootstrapped and managed by the platform.
    const localConfig = rawFirebaseConfig as any;
    // Note: We check if it's valid (not placeholder)
    const isLocalValid = localConfig && localConfig.apiKey && !localConfig.apiKey.includes('remixed') && localConfig.apiKey.length > 10;

    // IF local config is valid, we HIGHLY prefer it in this environment
    if (isLocalValid) {
        console.log(`[Firebase Diagnostics] Using local bootstrapped config for project: ${localConfig.projectId}`);
        return localConfig;
    }

    // 2. Look for overrides in environment variables if local config is invalid
    try {
        const apiKey = import.meta.env?.VITE_FIREBASE_API_KEY;
        const configJson = import.meta.env?.VITE_FIREBASE_CONFIG;
        const envProjectId = import.meta.env?.VITE_FIREBASE_PROJECT_ID;

        if (configJson) {
            console.log("[Firebase Diagnostics] OVERRIDE: Using Firebase config from VITE_FIREBASE_CONFIG environment variable");
            return JSON.parse(configJson);
        }

        if (apiKey) {
            console.log(`[Firebase Diagnostics] OVERRIDE: Using individual VITE_FIREBASE_* env vars. Project: ${envProjectId}`);
            return {
                apiKey,
                authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
                projectId: envProjectId,
                storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
                appId: import.meta.env.VITE_FIREBASE_APP_ID,
                databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
                firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
            };
        }
    } catch (error) {
        console.error("[Firebase Diagnostics] Error parsing environment Firebase config:", error);
    }

    console.warn("[Firebase Diagnostics] No valid Firebase configuration found. Using fallback localConfig (which may be placeholder).");
    return localConfig;
};

const firebaseConfig = getFirebaseConfig() as FirebaseConfig;

// Validate critical config before proceeding
if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey.includes('remixed')) {
  console.warn("Firebase configuration appears invalid or represents placeholder values. Please ensure set_up_firebase has been run or environment variables are set correctly.");
}

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Use (default) if firestoreDatabaseId is not provided or looks like a URL
let databaseId = firebaseConfig.firestoreDatabaseId || '(default)';

// HEURISTIC: Many users accidentally paste their databaseURL (RTDB) into the Database ID field
// Firestore Database IDs are short strings (e.g., "(default)", "my-db"), never URLs.
if (databaseId.startsWith('http') || databaseId.includes('://') || databaseId.includes('.firebaseio.com')) {
  console.warn(`[Firebase Diagnostics] Invalid Database ID detected: "${databaseId}". 
  This looks like a Realtime Database URL rather than a Firestore Database ID. 
  Falling back to "(default)".`);
  databaseId = '(default)';
}

console.log(`[Firebase Diagnostics] Initializing Firestore.
  Project: ${firebaseConfig.projectId}
  Database: ${databaseId}
  Long Polling: Enabled`);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  // We use long polling to avoid WebSocket issues in some preview environments
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
