import supabase from './supabaseClient';
import { getURL } from './getURL';

// Guards to provide useful errors before configuration is complete
const ensureClient = () => {
  if (!supabase) {
    return { error: new Error('Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.') };
  }
  return {};
};

export const signUp = async (email, password) => {
  const { error: guardError } = ensureClient();
  if (guardError) return { data: null, error: guardError };

  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getURL()}auth/callback`,
    },
  });
};

export const resetPassword = async (email) => {
  const { error: guardError } = ensureClient();
  if (guardError) return { data: null, error: guardError };

  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getURL()}auth/reset-password`,
  });
};

export const signInWithMagicLink = async (email) => {
  const { error: guardError } = ensureClient();
  if (guardError) return { data: null, error: guardError };

  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${getURL()}auth/callback`,
    },
  });
};

export const signInWithOAuth = async (provider) => {
  const { error: guardError } = ensureClient();
  if (guardError) return { data: null, error: guardError };

  return supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${getURL()}auth/callback`,
    },
  });
};
