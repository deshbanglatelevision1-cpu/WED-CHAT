import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
import { initializeFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import rawFirebaseConfig from "../../firebase-applet-config.json";

// Helper to resolve the best configuration available
const getFirebaseConfig = () => {
    // 1. Try to get config from environment variable (useful for Vercel/Production deployment)
    try {
        // Vite typically uses import.meta.env
        const viteConfig = import.meta.env?.VITE_FIREBASE_CONFIG;
        if (viteConfig) {
            console.log("Config loaded from VITE_FIREBASE_CONFIG");
            return JSON.parse(viteConfig);
        }

        // Fallback for check against process.env (some build setups)
        if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_FIREBASE_CONFIG) {
            console.log("Config loaded from NEXT_PUBLIC_FIREBASE_CONFIG");
            return JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG);
        }
    } catch (error) {
        console.error("Critical: Could not parse Firebase config from environment variables:", error);
    }

    // 2. Fallback to the local configuration file bootstrapped by AI Studio
    console.log("Config loaded from local firebase-applet-config.json");
    return rawFirebaseConfig;
};

const firebaseConfig = getFirebaseConfig();

// Validate critical config before proceeding
if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey.includes('remixed')) {
  console.warn("Firebase configuration appears invalid or represents placeholder values. Please ensure set_up_firebase has been run or environment variables are set correctly.");
}

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId || undefined);
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error.code !== "auth/popup-closed-by-user" && error.code !== "auth/cancelled-popup-request" && error.code !== "auth/popup-blocked") {
      console.error("Error signing in with Google:", error);
    }
    throw error;
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
