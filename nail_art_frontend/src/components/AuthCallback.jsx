import React, { useEffect, useState } from 'react';
import { handleAuthError } from '../utils/auth';

/**
 * Auth callback handler:
 * - This component is intentionally NOT imported anywhere yet.
 * - Once @supabase/supabase-js is installed and env vars are set,
 *   add a route or conditional render to use it at /auth/callback.
 */
export default function AuthCallback() {
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const navigate = (path) => window.location.replace(path);

    const handleAuthCallback = async () => {
      try {
        // Dynamically import client to keep it out of the main bundle until needed.
        const { default: supabase } = await import('../utils/supabaseClient');
        if (!supabase) {
          setStatus('Supabase not configured.');
          return;
        }

        // Supabase JS v2: exchange code for session using the full URL
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) {
          handleAuthError(error, navigate);
          return;
        }

        if (data?.session) {
          navigate('/'); // Redirect to home or dashboard
        } else {
          setStatus('No active session found.');
        }
      } catch (error) {
        handleAuthError(error, (path) => window.location.replace(path));
      }
    };

    handleAuthCallback();
  }, []);

  return <div>{status}</div>;
}
