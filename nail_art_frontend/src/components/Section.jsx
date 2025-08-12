import React from 'react';

/**
 * PUBLIC_INTERFACE
 * Generic section wrapper with heading and subtitle.
 */
export default function Section({ id, title, subtitle, children }) {
  return (
    <section id={id} className="section">
      <div className="container">
        <div className="section-header">
          <span className="kicker">{title}</span>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}
