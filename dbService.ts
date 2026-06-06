import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect,
  signInWithPopup,    // TILLAGD: Används i iframe-miljö för sandlådesafer inloggning
  getRedirectResult,  // TILLAGD: För att fånga upp resultatet efter redirect
  signOut, 
  User, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocs, 
  collection, 
  setDoc, 
  getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

// ---------------------------------------------------------
// 🚨 Types and Interface for pluggable Databasing
// ---------------------------------------------------------
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export interface DatabaseService {
  name: string;
  isReady: boolean;
  
  initialize(onReadyCallback: () => void): () => void;
  getData(): Promise<Record<string, any>>;
  saveState(key: string, value: any): Promise<void>;
  
  // Pluggable Authentication
  signInWithGoogle(): Promise<User | null>; // ÄNDRAD: Kan returnera null initialt vid redirect
  logout(): Promise<void>;
  getCurrentUser(): User | null;
  onAuthChange(callback: (user: User | null) => void): () => void;
}

// ---------------------------------------------------------
// 🎒 Firebase Setup & Error Handlers
// ---------------------------------------------------------
const getFirebaseConfig = () => {
  const metaEnv = (import.meta as any).env || {};
  if (
    metaEnv.VITE_FIREBASE_API_KEY &&
    metaEnv.VITE_FIREBASE_AUTH_DOMAIN &&
    metaEnv.VITE_FIREBASE_PROJECT_ID
  ) {
    return {
      apiKey: metaEnv.VITE_FIREBASE_API_KEY,
      authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: metaEnv.VITE_FIREBASE_PROJECT_ID,
      storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: metaEnv.VITE_FIREBASE_APP_ID,
      measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID,
      firestoreDatabaseId: metaEnv.VITE_FIREBASE_DATABASE_ID || '(default)'
    };
  }
  return firebaseConfig;
};

const finalConfig = getFirebaseConfig();
const app = initializeApp(finalConfig);
export const db = getFirestore(app, finalConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ---------------------------------------------------------
// 🔌 Active Provider Class: Firebase Firestore
// ---------------------------------------------------------
export class FirebaseDatabaseService implements DatabaseService {
  public name = 'Firebase Firestore';
  public isReady = false;

  public initialize(onReadyCallback: () => void): () => void {
    // Test the network connection to Firestore as requested by the rule
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'app_state', 'connection_test_placeholder'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.warn("Firebase Connection Warning: The client is offline or cannot connect. Please verify your Firebase project settings (Project ID, API Lock, Auth Domain) in the settings menu or Firebase Console.");
        }
      }
    };
    testConnection();

    // Fånga upp redirect-resultat om användaren precis kommit tillbaka från inloggningen
    getRedirectResult(auth).catch((error) => {
      console.error("Fel vid hantering av inloggnings-redirect:", error);
    });

    // Authenticate changes
    const unsubscribe = onAuthStateChanged(auth, () => {
      this.isReady = true;
      onReadyCallback();
    });
    return unsubscribe;
  }

  public async getData(): Promise<Record<string, any>> {
    const states: Record<string, any> = {};
    const path = 'app_state';
    
    try {
      const querySnapshot = await getDocs(collection(db, path));
      querySnapshot.forEach((docSnap) => {
        const docData = docSnap.data();
        if (docData && docData.key) {
          states[docData.key] = docData.value;
        }
      });
      return states;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return {};
    }
  }

  public async saveState(key: string, value: any): Promise<void> {
    const path = `app_state/${key}`;
    try {
      await setDoc(doc(db, 'app_state', key), {
        key,
        value
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // RELEASABLE OAUTH: Intelligent hybrid flow
  // - Provar signInWithPopup först (så du slipper COOP/Authorized Domains-krångel i onödan)
  // - Om popups är blockerade faller den tillbaka på signInWithRedirect
  public async signInWithGoogle(): Promise<User | null> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    console.log("Attempting Google Sign-In with popup...");
    try {
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error: any) {
      const errorCode = error?.code;
      console.warn("Google Sign-In with popup failed/blocked, checking fallback:", error);
      
      if (
        errorCode === 'auth/popup-blocked' || 
        errorCode === 'auth/cancelled-popup-request' ||
        (error?.message && error.message.includes('popup'))
      ) {
        console.log("Popup blocked or failed. Redirecting to Google OAuth flow instead...");
        try {
          await signInWithRedirect(auth, provider);
          return null; // Redirect pågår
        } catch (redirectError: any) {
          console.error("Google Sign-In with redirect fallback failed:", redirectError);
          this.handleAuthError(redirectError);
          throw redirectError;
        }
      } else if (errorCode === 'auth/popup-closed-by-user') {
        console.log("User closed the popup.");
        return null;
      } else {
        this.handleAuthError(error);
        throw error;
      }
    }
  }

  private handleAuthError(error: any) {
    const errorCode = error?.code;
    const hostname = window.location.hostname;
    
    if (errorCode === 'auth/unauthorized-domain' || (error?.message && error.message.includes('unauthorized-domain'))) {
      alert(
        `Domänen "${hostname}" är inte tillagd som auktoriserad domän i ditt Firebase-projekt!\n\n` +
        `För att kunna logga in här behöver du:\n` +
        `1. Gå till Firebase Console (https://console.firebase.google.com/)\n` +
        `2. Välj ditt projekt "centerline-pro"\n` +
        `3. Gå till Authentication -> Settings/Inställningar (Settings-fliken)\n` +
        `4. Klicka på "Authorized domains" / "Auktoriserade domäner"\n` +
        `5. Lägg till "${hostname}" till listan.\n\n` +
        `När det är klart kommer inloggningen att fungera!`
      );
    } else {
      alert(
        `Inloggningen misslyckades:\n${error?.message || error}\n\n` +
        `Säkerställ att din Firebase-konfiguration är korrekt (t.ex. i /firebase-applet-config.json) och att Authentication i Firebase Console har Google aktiverat.`
      );
    }
  }

  public async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Failed logout:', error);
      throw error;
    }
  }

  public getCurrentUser(): User | null {
    return auth.currentUser;
  }

  public onAuthChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }
}

// Global active database service instance
export const dbService = new FirebaseDatabaseService();
