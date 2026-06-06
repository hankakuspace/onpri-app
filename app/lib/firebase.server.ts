// app/lib/firebase.server.ts
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

type FirebaseServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function getFirebaseServiceAccount(): FirebaseServiceAccount | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

function ensureFirebaseApp() {
  const serviceAccount = getFirebaseServiceAccount();

  if (!serviceAccount) {
    return null;
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  return getApps()[0];
}

export function getFirebaseDb() {
  const app = ensureFirebaseApp();

  if (!app) {
    return null;
  }

  return getFirestore();
}

export function getFirebaseStorageBucket() {
  const app = ensureFirebaseApp();

  if (!app) {
    return null;
  }

  return getStorage().bucket("onpri-app.firebasestorage.app");
}
