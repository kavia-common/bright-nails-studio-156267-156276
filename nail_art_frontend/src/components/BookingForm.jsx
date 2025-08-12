import React, { useEffect, useMemo, useRef, useState } from 'react';
import supabase from '../utils/supabaseClient';
import { notifyNewBooking } from '../utils/emailApi';

const DEFAULT_SLOTS = ['10:00 AM', '11:30 AM', '1:00 PM', '2:30 PM', '4:00 PM'];

/**
 * PUBLIC_INTERFACE
 * Appointment booking form with Supabase submission.
 * - Collects name, email, mobile, service, day, time slot, and notes.
 * - On submit, inserts a row into public.bookings using the anon key (no auth required).
 * - Shows user-friendly success or error messages.
 * - Maintains a local "booked" map to reflect taken slots in the UI immediately.
 */
export default function BookingForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [notes, setNotes] = useState('');
  const [service, setService] = useState('Mini Mani');
  const [day, setDay] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [booked, setBooked] = useState({}); // { 'YYYY-MM-DD': ['10:00 AM'] }

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Ref for success banner to ensure it's visible
  const successRef = useRef(null);

  // generate next 7 days
  const days = useMemo(() => {
    const arr = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const id = `${yyyy}-${mm}-${dd}`;
      arr.push({
        id,
        label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      });
    }
    return arr;
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem('bns_booked');
    if (raw) setBooked(JSON.parse(raw));
  }, []);

  useEffect(() => {
    localStorage.setItem('bns_booked', JSON.stringify(booked));
  }, [booked]);

  // Auto-dismiss success message after a few seconds and ensure visibility
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(''), 6000);
    // Give DOM time to paint the banner then scroll it into view
    const s = setTimeout(() => {
      try {
        successRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {
        /* no-op */
      }
    }, 200);
    return () => {
      clearTimeout(t);
      clearTimeout(s);
    };
  }, [successMsg]);

  const slotsForDay = useMemo(() => {
    const taken = new Set(booked[day] || []);
    return DEFAULT_SLOTS.map((s) => ({
      label: s,
      available: !taken.has(s),
    }));
  }, [booked, day]);

  const reset = () => {
    setName('');
    setEmail('');
    setMobile('');
    setNotes('');
    setService('Mini Mani');
    setDay('');
    setSelectedSlot('');
  };

  const to24h = (label) => {
    // Convert '1:00 PM' to { hour: 13, minute: 0 }
    if (!label) return null;
    const match = label.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    const [, h, m, mer] = match;
    let hour = parseInt(h, 10);
    const minute = parseInt(m, 10);
    const meridiem = String(mer).toUpperCase();
    if (meridiem === 'PM' && hour !== 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    return { hour, minute };
  };

  const getRequestedDate = () => {
    // Build a Date using local time from 'YYYY-MM-DD' and selectedSlot
    if (!day || !selectedSlot) return null;
    const [yyyy, mm, dd] = day.split('-').map((x) => parseInt(x, 10));
    const hm = to24h(selectedSlot);
    if (!hm) return null;
    // Use local time; toISOString() will convert to UTC for storage in timestamptz
    return new Date(yyyy, mm - 1, dd, hm.hour, hm.minute, 0, 0);
  };

  const formatForMessage = (dt) => {
    try {
      return dt.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return `${day} ${selectedSlot}`;
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!name || !email || !mobile || !service || !day || !selectedSlot) {
      setErrorMsg('Please fill out your name, email, mobile, pick a day, and select a time slot.');
      return;
    }

    const requestedAt = getRequestedDate();
    if (!requestedAt || isNaN(requestedAt.getTime())) {
      setErrorMsg('Please select a valid date and time.');
      return;
    }

    if (!supabase) {
      setErrorMsg(
        'Booking system is not configured yet. Please try again later. (Missing Supabase URL or anon key)'
      );
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name,
        email,
        mobile,
        requested_time: requestedAt.toISOString(),
        service_type: service,
        notes,
        // status will default to 'pending' on the server if the schema matches the provided SQL
      };

      const { data, error } = await supabase.from('bookings').insert(payload).select().maybeSingle();

      if (error) {
        // Handle a duplicate timeslot or RLS error gracefully
        const msg =
          error.message?.toLowerCase().includes('policy') ||
          error.message?.toLowerCase().includes('rls')
            ? 'Your booking could not be created due to access restrictions. Please contact us.'
            : error.message || 'Unable to create your booking at this time.';
        setErrorMsg(msg);
        return;
      }

      // Fire-and-forget admin email notification (non-blocking)
      notifyNewBooking(payload).catch(() => { /* ignore errors in UI */ });

      // Optimistically mark slot as taken locally for this device
      setBooked((prev) => {
        const daySet = new Set(prev[day] || []);
        daySet.add(selectedSlot);
        return { ...prev, [day]: Array.from(daySet) };
      });

      const whenStr = formatForMessage(requestedAt);
      const refId = data?.id ? ` Reference: ${String(data.id).slice(0, 8)}…` : '';
      setSuccessMsg(
        `Thanks ${name}! Your request for ${service} on ${whenStr} was received. We'll confirm shortly.${refId}`
      );
      reset();
    } catch (err) {
      setErrorMsg(err?.message || 'Something went wrong while sending your request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="booking">
        <form onSubmit={submit} className="card" aria-label="Booking form">
          <div className="form-field">
            <label htmlFor="bf_name">Your name</label>
            <input
              id="bf_name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Taylor Swift"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="bf_email">Email</label>
            <input
              id="bf_email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="bf_mobile">Mobile</label>
            <input
              id="bf_mobile"
              className="input"
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="(555) 123-4567"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="bf_service">Service</label>
            <select
              id="bf_service"
              value={service}
              onChange={(e) => setService(e.target.value)}
            >
              <option>Mini Mani</option>
              <option>Glitter Glam</option>
              <option>Character Cuties</option>
              <option>Minimal Chic</option>
              <option>Mix & Match</option>
              <option>Bestie Set</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="bf_day">Day</label>
            <select id="bf_day" value={day} onChange={(e) => setDay(e.target.value)}>
              <option value="">Pick a day</option>
              {days.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Available slots</label>
            <div className="slots" role="listbox" aria-label="Available time slots">
              {slotsForDay.map((s) => (
                <button
                  type="button"
                  key={s.label}
                  className={`slot ${selectedSlot === s.label ? 'selected' : ''} ${
                    s.available ? '' : 'unavailable'
                  }`}
                  onClick={() => s.available && setSelectedSlot(s.label)}
                  disabled={!s.available}
                  aria-pressed={selectedSlot === s.label}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="bf_notes">Notes (optional)</label>
            <textarea
              id="bf_notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any preferences or details you'd like to share?"
            />
          </div>

          <div className="form-field">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Request Booking'}
            </button>
          </div>

          {errorMsg && (
            <p aria-live="assertive" style={{ color: 'crimson', fontWeight: 700 }}>
              {errorMsg}
            </p>
          )}
        </form>

        <aside className="card">
          <h3>Good to know</h3>
          <ul>
            <li>Please arrive with clean nails (no old polish if possible).</li>
            <li>Design times vary from 30–75 minutes depending on detail.</li>
            <li>Parents are welcome to stay during the appointment.</li>
          </ul>
        </aside>
      </div>

      {successMsg && (
        <div
          ref={successRef}
          role="status"
          aria-live="polite"
          className="card"
          style={{
            marginTop: 12,
            border: '1px solid #10b981',
            background: '#d1fae5',
            color: '#065f46',
            fontWeight: 700,
          }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span aria-hidden="true">✅</span>
            <span>{successMsg}</span>
          </div>
          <p style={{ marginTop: 6, fontWeight: 600, color: '#065f46' }}>
            We’ll email you once it’s approved — usually within a day. Thanks for booking!
          </p>
        </div>
      )}
    </>
  );
}
