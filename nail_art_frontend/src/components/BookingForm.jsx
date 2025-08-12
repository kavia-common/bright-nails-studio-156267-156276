import React, { useEffect, useMemo, useState } from 'react';

const DEFAULT_SLOTS = ['10:00 AM', '11:30 AM', '1:00 PM', '2:30 PM', '4:00 PM'];

/**
 * PUBLIC_INTERFACE
 * Appointment booking form with simple slot management and local persistence.
 */
export default function BookingForm() {
  const [name, setName] = useState('');
  const [service, setService] = useState('Mini Mani');
  const [day, setDay] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [booked, setBooked] = useState({}); // { 'YYYY-MM-DD': ['10:00 AM'] }
  const [message, setMessage] = useState('');

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
      arr.push({ id, label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) });
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

  const slotsForDay = useMemo(() => {
    const taken = new Set(booked[day] || []);
    return DEFAULT_SLOTS.map(s => ({
      label: s,
      available: !taken.has(s),
    }));
  }, [booked, day]);

  const reset = () => {
    setName('');
    setService('Mini Mani');
    setDay('');
    setSelectedSlot('');
    setMessage('');
  };

  const submit = (e) => {
    e.preventDefault();
    if (!name || !service || !day || !selectedSlot) {
      setMessage('Please fill out your name, pick a day, and select a time slot.');
      return;
    }
    setBooked(prev => {
      const daySet = new Set(prev[day] || []);
      daySet.add(selectedSlot);
      return { ...prev, [day]: Array.from(daySet) };
    });
    setMessage(`Thanks ${name}! Your request for ${service} on ${day} at ${selectedSlot} was received. We'll confirm shortly.`);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 200);
    reset();
  };

  return (
    <div className="booking">
      <form onSubmit={submit} className="card" aria-label="Booking form">
        <div className="form-field">
          <label htmlFor="bf_name">Your name</label>
          <input id="bf_name" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Taylor Swift" />
        </div>
        <div className="form-field">
          <label htmlFor="bf_service">Service</label>
          <select id="bf_service" value={service} onChange={e => setService(e.target.value)}>
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
          <select id="bf_day" value={day} onChange={e => setDay(e.target.value)}>
            <option value="">Pick a day</option>
            {days.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>

        <div className="form-field">
          <label>Available slots</label>
          <div className="slots" role="listbox" aria-label="Available time slots">
            {slotsForDay.map(s => (
              <button
                type="button"
                key={s.label}
                className={`slot ${selectedSlot === s.label ? 'selected' : ''} ${s.available ? '' : 'unavailable'}`}
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
          <button className="btn btn-primary" type="submit">Request Booking</button>
        </div>
        {message && <p aria-live="polite">{message}</p>}
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
  );
}
