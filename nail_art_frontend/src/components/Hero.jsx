import React, { useEffect, useRef } from 'react';

/**
 * PUBLIC_INTERFACE
 * Large welcoming hero with tagline and decorative sparkles.
 */
export default function Hero() {
  const artRef = useRef(null);

  useEffect(() => {
    // Create some sparkles positioned randomly inside hero art panel
    const host = artRef.current;
    if (!host) return;
    const count = 14;
    const nodes = [];
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.className = 'sparkle';
      s.style.left = Math.random() * 90 + '%';
      s.style.top = Math.random() * 90 + '%';
      nodes.push(s);
      host.appendChild(s);
    }
    return () => nodes.forEach(n => n.remove());
  }, []);

  return (
    <header className="hero section" id="home" aria-label="Welcome">
      <div className="container hero-inner">
        <div>
          <div className="badge" aria-label="Kid-friendly and professional">✨ Kid-friendly & professional</div>
          <h1 className="hero-title">Nail art that sparkles with your style</h1>
          <p className="hero-subtitle">
            Bright, modern designs for teens, kids, and parents — created with care by a 12-year-old artist.
          </p>
          <div className="hero-cta">
            <a href="#booking" className="btn btn-primary">Book an Appointment</a>
            <a href="#services" className="btn btn-secondary">See Services</a>
          </div>
        </div>
        <div className="hero-art" ref={artRef} aria-hidden="true" />
      </div>
    </header>
  );
}
