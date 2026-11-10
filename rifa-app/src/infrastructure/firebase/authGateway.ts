import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import type { AuthGateway } from '../../application/ports';
import { auth } from './app';
import { refs } from './paths';

const isAdmin = async (uid: string): Promise<boolean> => {
  try {
    const snap = await getDoc(refs.user(uid));
    return snap.exists() && snap.data().role === 'admin';
  } catch {
    return false;
  }
};

export const authGateway: AuthGateway = {
  watchSession: (onChange) =>
    onAuthStateChanged(auth, async (user) => {
      onChange(user ? { uid: user.uid, email: user.email, isAdmin: await isAdmin(user.uid) } : null);
    }),

  signIn: async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  },

  signOut: () => signOut(auth),

  sendPasswordReset: (email) =>
    sendPasswordResetEmail(auth, email, { url: `${window.location.origin}/login` }),
};
