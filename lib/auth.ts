import { useSyncExternalStore } from 'react';
import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};


export type SignUpProfile = {
  full_name: string;
};

let snapshot: AuthState = { session: null, user: null, loading: true };

const listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

export function setAuth(session: Session | null) {
  snapshot = { session, user: session?.user ?? null, loading: false };
  notify();
}

let authListenerInitialized = false;

function initializeAuthListener() {
  if (authListenerInitialized) return;

  authListenerInitialized = true;

  supabase.auth.onAuthStateChange((_event, session) => {
    setAuth(session);
  });

  supabase.auth
    .getSession()
    .then(({ data, error }) => {
      if (error) {
        console.error('Unable to restore session:', error.message);
        setAuth(null);
        return;
      }

      setAuth(data.session);
    })
    .catch((error) => {
      console.error('Auth initialization failed:', error);
      setAuth(null);
    });


  setTimeout(() => {
    if (snapshot.loading) {
      console.warn('Auth check timed out; continuing as signed out.');
      setAuth(null);
    }
  }, 6000);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  initializeAuthListener();

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export async function signUp(
  email: string,
  password: string,
  profile?: SignUpProfile
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: profile
      ? {
          data: {
            full_name: profile.full_name,
          },
        }
      : undefined,
  });

  if (error || !profile) {
    return { data, error };
  }

  if (!data.session) {
    return { data, error: null };
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: profile.full_name,
    })
    .eq('id', data.session.user.id);

  if (profileError) {
    return {
      data,
      error: {
        ...profileError,
        message:
          'Your account was created, but saving your profile failed: ' +
          profileError.message,
      },
    };
  }

  setAuth(data.session);

  return { data, error: null };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!error && data.session) {
    setAuth(data.session);
  }

  return { data, error };
}

export async function signOut() {
  
  const { error } = await supabase.auth.signOut();


  setAuth(null);

  if (error) {
    throw error;
  }

  return { error: null };
}