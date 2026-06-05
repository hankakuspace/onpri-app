// app/lib/firebase.server.ts
import { cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return;
  }

  const serviceAccount = getFirebaseServiceAccount();

  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount),
    });
    return;
  }

  initializeApp({
    credential: applicationDefault(),
  });
}

initializeFirebaseAdmin();

export const db = getFirestore();
