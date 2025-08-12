import React, { useState } from 'react';

/**
 * PUBLIC_INTERFACE
 * Contact form that uses mailto as a simple submission method.
 */
export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  const send = (e) => {
    e.preventDefault();
    const to = 'hello@brightnails.example.com';
    const subject = encodeURIComponent(`Message from ${name || 'a visitor'}`);
    const body = encodeURIComponent(`${msg}\n\nFrom: ${name}\nEmail: ${email}`);
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="contact-grid">
      <form className="contact-card" onSubmit={send} aria-label="Contact form">
        <div className="form-field">
          <label htmlFor="c_name">Name</label>
          <input id="c_name" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div className="form-field">
          <label htmlFor="c_email">Email</label>
          <input id="c_email" className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="form-field">
          <label htmlFor="c_msg">Message</label>
          <textarea id="c_msg" rows={5} value={msg} onChange={e => setMsg(e.target.value)} placeholder="Hello! I'd like to..." />
        </div>
        <button className="btn btn-primary" type="submit">Send Message</button>
      </form>
      <aside className="contact-card">
        <h3>Connect</h3>
        <p>We love messages and inspo pics!</p>
        <div className="socials">
          <a href="#instagram">📸 Instagram</a>
          <a href="#booking">🗓️ Book</a>
          <a href="#payments">💳 Payments</a>
          <a href="https://maps.example.com" target="_blank" rel="noreferrer">📍 Location</a>
        </div>
      </aside>
    </div>
  );
}
