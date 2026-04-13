import { create } from "zustand";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface UserProfile {
  id: number;
  uid: string;
  username: string;
  email: string;
  phone: string;
  profile_photo: string;
  primary_role: string;
  bowling_style: string;
  skill_level: string;
  is_admin: number;
  created_at?: string;
}

interface AuthState {
  firebaseUser: FirebaseUser | null;
  user: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: UserProfile | null) => void;
  fetchProfile: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string, profile: {
    username: string;
    role: string;
    skillLevel: string;
    bowlingStyle: string;
  }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const googleProvider = new GoogleAuthProvider();

async function getIdToken(): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  return currentUser.getIdToken();
}

export const useAuth = create<AuthState>((set, get) => ({
  firebaseUser: null,
  user: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user, loading: false }),

  fetchProfile: async () => {
    const token = await getIdToken();
    if (!token) {
      set({ user: null, loading: false });
      return;
    }
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({ user: data.user, loading: false });
      } else {
        set({ user: null, loading: false });
      }
    } catch {
      set({ user: null, loading: false });
    }
  },

  loginWithEmail: async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    set({ firebaseUser: cred.user });
    await get().fetchProfile();
  },

  signupWithEmail: async (email, password, profile) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    set({ firebaseUser: cred.user });
    const token = await cred.user.getIdToken();
    // Create profile in database
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profile),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to create profile");
    }
    const data = await res.json();
    set({ user: data.user, loading: false });
  },

  loginWithGoogle: async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    set({ firebaseUser: cred.user });
    const token = await cred.user.getIdToken();
    // Try to fetch existing profile
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      set({ user: data.user, loading: false });
    } else {
      // New Google user — create profile with defaults
      const profileRes = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: cred.user.displayName || "Player",
          role: "Batter",
          skillLevel: "Beginner",
          bowlingStyle: "",
        }),
      });
      if (profileRes.ok) {
        const data = await profileRes.json();
        set({ user: data.user, loading: false });
      }
    }
  },

  logout: async () => {
    await signOut(auth);
    set({ firebaseUser: null, user: null });
  },

  resetPassword: async (email) => {
    await sendPasswordResetEmail(auth, email);
  },
}));

// Listen to Firebase auth state changes (only if auth is configured)
if (typeof auth.onAuthStateChanged === "function") {
  onAuthStateChanged(auth, async (firebaseUser) => {
    const store = useAuth.getState();
    if (firebaseUser) {
      useAuth.setState({ firebaseUser, initialized: true });
      if (!store.user) {
        await store.fetchProfile();
      }
    } else {
      useAuth.setState({
        firebaseUser: null,
        user: null,
        loading: false,
        initialized: true,
      });
    }
  });
} else {
  // Firebase not configured — mark as initialized so the app doesn't hang
  useAuth.setState({ initialized: true, loading: false });
}
