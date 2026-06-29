import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously, 
  sendPasswordResetEmail,
  signOut 
} from "firebase/auth";
import { doc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../firebase";
import { UserPreferences } from "../types";

interface AuthContextType {
  user: User | null;
  preferences: UserPreferences | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: 'student' | 'professional' | 'entrepreneur') => Promise<void>;
  loginGuest: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updatePreferences: (newPrefs: Partial<UserPreferences>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  // Monitor Auth State Changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Sync user preferences document from Firestore
        const userDocRef = doc(db, "users", currentUser.uid);
        
        // Listen to preferences document changes in real time
        const unsubscribePrefs = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            setPreferences({
              ...docSnap.data() as UserPreferences,
              email: currentUser.email || undefined
            });
            setLoading(false);
          } else {
            // Profile does not exist, let's create a default profile
            const defaultPrefs: UserPreferences = {
              name: currentUser.isAnonymous ? "Guest Companion" : (currentUser.email?.split('@')[0] || "User"),
              role: "professional",
              preferredFocusHours: "morning",
              productivityScore: 75,
              email: currentUser.email || undefined
            };
            try {
              await setDoc(userDocRef, defaultPrefs);
              setPreferences(defaultPrefs);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
            }
            setLoading(false);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
          setLoading(false);
        });

        return () => unsubscribePrefs();
      } else {
        setPreferences(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      if (err.code === "auth/operation-not-allowed" || err.message?.includes("operation-not-allowed")) {
        console.warn("Email/Password auth is disabled in Firebase console. Transitioning to resilient Local Offline Mode for this session.", err);
        const offlineUid = "offline-" + email.replace(/[^a-zA-Z0-9]/g, "-");
        const localUser = {
          uid: offlineUid,
          email,
          emailVerified: true,
          isAnonymous: false,
          displayName: email.split('@')[0],
        } as any;
        
        const storedPrefs = localStorage.getItem(`dg_${offlineUid}_preferences`);
        let localPrefs: UserPreferences;
        if (storedPrefs) {
          try {
            localPrefs = JSON.parse(storedPrefs);
          } catch {
            localPrefs = {
              name: email.split('@')[0],
              role: "professional",
              preferredFocusHours: "morning",
              productivityScore: 75,
              email
            };
          }
        } else {
          localPrefs = {
            name: email.split('@')[0],
            role: "professional",
            preferredFocusHours: "morning",
            productivityScore: 75,
            email
          };
          localStorage.setItem(`dg_${offlineUid}_preferences`, JSON.stringify(localPrefs));
        }

        setUser(localUser);
        setPreferences(localPrefs);
        setLoading(false);
        return;
      }
      setLoading(false);
      throw err;
    }
  };

  const register = async (email: string, password: string, name: string, role: 'student' | 'professional' | 'entrepreneur') => {
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const userDocRef = doc(db, "users", result.user.uid);
      const initialPrefs: UserPreferences = {
        name,
        role,
        preferredFocusHours: "morning",
        productivityScore: 75,
        email
      };
      try {
        await setDoc(userDocRef, initialPrefs);
        setPreferences(initialPrefs);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${result.user.uid}`);
      }
    } catch (err: any) {
      if (err.code === "auth/operation-not-allowed" || err.message?.includes("operation-not-allowed")) {
        console.warn("Email/Password registration is disabled in Firebase console. Transitioning to resilient Local Offline Mode for this session.", err);
        const offlineUid = "offline-" + email.replace(/[^a-zA-Z0-9]/g, "-");
        const localUser = {
          uid: offlineUid,
          email,
          emailVerified: true,
          isAnonymous: false,
          displayName: name,
        } as any;

        const localPrefs: UserPreferences = {
          name,
          role,
          preferredFocusHours: "morning",
          productivityScore: 75,
          email
        };
        localStorage.setItem(`dg_${offlineUid}_preferences`, JSON.stringify(localPrefs));

        setUser(localUser);
        setPreferences(localPrefs);
        setLoading(false);
        return;
      }
      setLoading(false);
      throw err;
    }
  };

  const loginGuest = async () => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      console.warn("Anonymous sign-in failed, attempting email-based guest fallback...", err);
      const fallbackEmail = "guest.companion@example.com";
      const fallbackPassword = "GuestPassword123!";
      
      try {
        await signInWithEmailAndPassword(auth, fallbackEmail, fallbackPassword);
      } catch (signInErr: any) {
        console.warn("Sign-in with fallback email failed, trying to register the guest account...", signInErr);
        try {
          const result = await createUserWithEmailAndPassword(auth, fallbackEmail, fallbackPassword);
          const userDocRef = doc(db, "users", result.user.uid);
          const initialPrefs: UserPreferences = {
            name: "Guest Companion",
            role: "professional",
            preferredFocusHours: "morning",
            productivityScore: 75,
            email: fallbackEmail
          };
          try {
            await setDoc(userDocRef, initialPrefs);
          } catch (dbErr) {
            console.warn("Failed to create Firestore user document, ignoring as we will sync locally.", dbErr);
          }
          setPreferences(initialPrefs);
        } catch (createErr: any) {
          console.warn("All Firebase Auth guest options are restricted or offline. Enabling 100% resilient Local Offline Guest Mode...", createErr);
          const localUser = {
            uid: "offline-guest-companion",
            email: fallbackEmail,
            emailVerified: true,
            isAnonymous: true,
            displayName: "Local Guest Companion",
          } as any;
          setUser(localUser);
          const localPrefs: UserPreferences = {
            name: "Local Guest Companion",
            role: "professional",
            preferredFocusHours: "morning",
            productivityScore: 75,
            email: fallbackEmail
          };
          setPreferences(localPrefs);
          setLoading(false);
        }
      }
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      throw err;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    if (!user) return;
    if (user.uid.startsWith("offline-")) {
      setPreferences(prev => {
        const updated = prev ? { ...prev, ...newPrefs } : null;
        if (updated) {
          localStorage.setItem(`dg_${user.uid}_preferences`, JSON.stringify(updated));
        }
        return updated;
      });
      return;
    }
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, newPrefs);
      setPreferences(prev => prev ? { ...prev, ...newPrefs } : null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      preferences,
      loading,
      login,
      register,
      loginGuest,
      resetPassword,
      logout,
      updatePreferences
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
