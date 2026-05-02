import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
import { initializeFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);
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
