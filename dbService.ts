import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User, onAuthStateChanged } from 'firebase/auth';
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
  signInWithGoogle(): Promise<User>;
  logout(): Promise<void>;
  getCurrentUser(): User | null;
  onAuthChange(callback: (user: User | null) => void): () => void;
}

// ---------------------------------------------------------
// 🎒 Firebase Setup & Error Handlers
// ---------------------------------------------------------
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
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
        await getDocFromServer(doc(db, 'test_connection_placeholder', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration or network connection.");
        }
      }
    };
    testConnection();

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

  // Pluggable oauth
  public async signInWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
      console.error('Failed Google sign-in:', error);
      throw error;
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
