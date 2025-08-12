import React, { useEffect, useMemo, useState } from 'react';
import supabase from '../utils/supabaseClient';
import { signInWithMagicLink, signInWithOAuth } from '../utils/authClient';

/**
 * PUBLIC_INTERFACE
 * Admin-only dashboard that lists all bookings and allows status updates.
 * Security model:
 * - Requires a logged-in Supabase user.
 * - Access allowed only if the user exists in public.admins (user_id = auth.users.id).
 * - Data access is enforced by RLS on the backend; frontend performs an additional check.
 *
 * Notes:
 * - Requires Supabase to be configured via environment variables (see assets/supabase.md).
 * - If RLS is configured as documented, anonymous select will be denied and only admins can view.
 */
export default function AdminDashboard() {
  const [supabaseReady, setSupabaseReady] = useState(!!supabase);
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [globalLoading, setGlobalLoading] = useState(false);
  const [noteEdits, setNoteEdits] = useState({}); // { id: 'text' }
  const [emailForMagicLink, setEmailForMagicLink] = useState('');
  const [actionBusyId, setActionBusyId] = useState(null);

  // Initial auth/session and admin check
  useEffect(() => {
    const bootstrap = async () => {
      setChecking(true);
      setErrorMsg('');

      if (!supabase) {
        setSupabaseReady(false);
        setChecking(false);
        return;
      }
      setSupabaseReady(true);

      try {
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) {
          setErrorMsg(sessionErr.message || 'Unable to get session.');
          setChecking(false);
          return;
        }
        const sessionUser = sessionData?.session?.user || null;
        setUser(sessionUser);

        if (!sessionUser) {
          setChecking(false);
          return;
        }

        // Check admin membership from public.admins
        const { data: adminRow, error: adminErr } = await supabase
          .from('admins')
          .select('user_id')
          .eq('user_id', sessionUser.id)
          .maybeSingle();

        if (adminErr) {
          // If policies deny access or table missing, surface a helpful message.
          setErrorMsg(
            adminErr.message ||
              'Access check failed. Ensure public.admins exists and RLS policies are configured.'
          );
          setIsAdmin(false);
          setChecking(false);
          return;
        }

        if (adminRow && adminRow.user_id === sessionUser.id) {
          setIsAdmin(true);
          await loadBookings();
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        setErrorMsg(err?.message || 'Unexpected error during admin check.');
      } finally {
        setChecking(false);
      }
    };

    bootstrap();
  }, []);

  // Load bookings for admins
  const loadBookings = async () => {
    if (!supabase) return;
    setGlobalLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(
          'id,name,email,mobile,requested_time,service_type,notes,status,created_at,admin_notes'
        )
        .order('requested_time', { ascending: true });

      if (error) {
        setErrorMsg(
          error.message ||
            'Unable to load bookings. Ensure RLS allows admin select as per documentation.'
        );
        return;
      }
      setBookings(data || []);
    } catch (e) {
      setErrorMsg(e?.message || 'Failed to load bookings.');
    } finally {
      setGlobalLoading(false);
    }
  };

  // Try to update using direct UPDATE; if denied, fallback to RPC if available
  const updateStatus = async (id, status) => {
    const notes = (noteEdits[id] || '').trim() || null;
    setActionBusyId(id);
    setErrorMsg('');

    try {
      // First attempt: direct update
      let resp = await supabase
        .from('bookings')
        .update({ status, admin_notes: notes })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (resp.error) {
        const msg = (resp.error.message || '').toLowerCase();
        // Fallback attempt: RPC function if direct update is restricted
        if (msg.includes('permission') || msg.includes('rls') || msg.includes('policy')) {
          const rpcRes = await supabase.rpc('set_booking_status', {
            p_id: id,
            p_status: status,
            p_admin_notes: notes,
          });
          if (rpcRes.error) {
            setErrorMsg(
              rpcRes.error.message ||
                'Update denied. Please ensure RLS and function permissions are set.'
            );
            return;
          }
        } else {
          setErrorMsg(resp.error.message || 'Update failed.');
          return;
        }
      }

      // Refresh local list
      await loadBookings();
    } catch (e) {
      setErrorMsg(e?.message || 'Status update failed.');
    } finally {
      setActionBusyId(null);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.reload();
  };

  const sendMagicLink = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!emailForMagicLink) return;

    try {
      const { error } = await signInWithMagicLink(emailForMagicLink);
      if (error) {
        setErrorMsg(error.message || 'Failed to send sign-in link.');
        return;
      }
      alert('Check your email for the sign-in link.'); // simple feedback
    } catch (err) {
      setErrorMsg(err?.message || 'Could not send sign-in link.');
    }
  };

  const formatDateTime = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  if (!supabaseReady) {
    return (
      <div className="container" style={{ padding: 24 }}>
        <h2>Admin Dashboard</h2>
        <p style={{ color: 'crimson', fontWeight: 700 }}>
          Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY,
          then restart the app. See assets/supabase.md for details.
        </p>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="container" style={{ padding: 24 }}>
        <h2>Admin Dashboard</h2>
        <p>Checking access…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ padding: 24, maxWidth: 640 }}>
        <h2>Admin Sign In</h2>
        <p className="subtitle">
          Sign in with your admin email. Access is restricted to users listed in public.admins.
        </p>

        <form onSubmit={sendMagicLink} className="card" style={{ marginTop: 12 }}>
          <div className="form-field">
            <label htmlFor="admin_email">Email</label>
            <input
              id="admin_email"
              className="input"
              type="email"
              placeholder="you@studio.com"
              value={emailForMagicLink}
              onChange={(e) => setEmailForMagicLink(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit">
            Send Magic Link
          </button>
        </form>

        <div className="card" style={{ marginTop: 12 }}>
          <p>Or sign in with:</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => signInWithOAuth('google')}
            >
              Continue with Google
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => signInWithOAuth('github')}
            >
              Continue with GitHub
            </button>
          </div>
        </div>

        {errorMsg && (
          <p aria-live="assertive" style={{ color: 'crimson', fontWeight: 700, marginTop: 12 }}>
            {errorMsg}
          </p>
        )}

        <p className="subtitle" style={{ marginTop: 12 }}>
          After signing in, ensure your user ID is added to public.admins in the database.
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container" style={{ padding: 24 }}>
        <h2>Admin Dashboard</h2>
        <p style={{ color: 'crimson', fontWeight: 700 }}>
          Access denied. Your account is not an admin. Please contact the site owner.
        </p>
        {errorMsg && (
          <p aria-live="assertive" style={{ color: 'crimson', fontWeight: 700 }}>{errorMsg}</p>
        )}
        <button className="btn btn-secondary" onClick={signOut} type="button">
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2>Admin Dashboard</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>
            {user?.email ? `Signed in as ${user.email}` : 'Signed in'}
          </span>
          <button className="btn btn-secondary" onClick={signOut} type="button">
            Sign Out
          </button>
        </div>
      </div>

      <p className="subtitle">View and manage booking requests.</p>

      {errorMsg && (
        <p aria-live="assertive" style={{ color: 'crimson', fontWeight: 700 }}>{errorMsg}</p>
      )}

      <div style={{ margin: '12px 0' }}>
        <button className="btn btn-secondary" onClick={loadBookings} disabled={globalLoading} type="button">
          {globalLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {bookings.length === 0 && !globalLoading && (
        <p>No bookings yet.</p>
      )}

      <div className="cards" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        {bookings.map((b) => (
          <article className="card" key={b.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0 }}>{b.name || '—'}</h3>
              <span
                className="badge"
                aria-label={`Status: ${b.status}`}
                style={{
                  background:
                    b.status === 'approved'
                      ? '#d1fae5'
                      : b.status === 'rejected'
                      ? '#fee2e2'
                      : '#fff3c4',
                  color:
                    b.status === 'approved'
                      ? '#065f46'
                      : b.status === 'rejected'
                      ? '#7f1d1d'
                      : '#6d5200',
                }}
              >
                {b.status || 'pending'}
              </span>
            </div>

            <p style={{ margin: '6px 0' }}>
              <strong>Requested:</strong> {formatDateTime(b.requested_time)}
            </p>
            <p style={{ margin: '6px 0' }}>
              <strong>Service:</strong> {b.service_type || '—'}
            </p>
            <p style={{ margin: '6px 0' }}>
              <strong>Contact:</strong> {b.email || '—'} {b.mobile ? `• ${b.mobile}` : ''}
            </p>
            {b.notes && (
              <p style={{ margin: '6px 0' }}>
                <strong>Notes:</strong> {b.notes}
              </p>
            )}

            <div className="form-field" style={{ marginTop: 8 }}>
              <label htmlFor={`note_${b.id}`}>Admin notes</label>
              <input
                id={`note_${b.id}`}
                className="input"
                placeholder="Optional note (e.g., See you soon!)"
                value={noteEdits[b.id] ?? (b.admin_notes || '')}
                onChange={(e) =>
                  setNoteEdits((prev) => ({ ...prev, [b.id]: e.target.value }))
                }
              />
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => updateStatus(b.id, 'approved')}
                disabled={actionBusyId === b.id}
                aria-label="Approve booking"
              >
                {actionBusyId === b.id ? 'Working…' : 'Approve'}
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => updateStatus(b.id, 'pending')}
                disabled={actionBusyId === b.id}
                aria-label="Mark pending"
              >
                Pending
              </button>
              <button
                className="btn"
                type="button"
                style={{ background: '#fee2e2', color: '#7f1d1d' }}
                onClick={() => updateStatus(b.id, 'rejected')}
                disabled={actionBusyId === b.id}
                aria-label="Reject booking"
              >
                Reject
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
