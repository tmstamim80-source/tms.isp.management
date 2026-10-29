import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseAppletConfig from '../../firebase-applet-config.json';

const getEnv = (key: string): string => {
  try {
    return (import.meta as any)?.env?.[key] || '';
  } catch {
    return '';
  }
};

const resolvedConfig = {
  apiKey: firebaseAppletConfig.apiKey || getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: firebaseAppletConfig.authDomain || getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: firebaseAppletConfig.projectId || getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: firebaseAppletConfig.storageBucket || getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: firebaseAppletConfig.messagingSenderId || getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: firebaseAppletConfig.appId || getEnv('VITE_FIREBASE_APP_ID'),
};

export const isFirebaseConfigured = Boolean(
  resolvedConfig.apiKey && 
  resolvedConfig.projectId && 
  resolvedConfig.apiKey !== '' &&
  resolvedConfig.projectId !== ''
);

let app: any = null;
let db: any = null;
let auth: any = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(resolvedConfig) : getApp();
    const databaseId = firebaseAppletConfig.firestoreDatabaseId || '(default)';
    db = (databaseId && databaseId !== '(default)') 
      ? getFirestore(app, databaseId) 
      : getFirestore(app);
    auth = getAuth(app);
  } catch (error) {
    console.warn('Firebase initialization skipped or failed:', error);
  }
}

export { app, db, auth };
export default resolvedConfig;
