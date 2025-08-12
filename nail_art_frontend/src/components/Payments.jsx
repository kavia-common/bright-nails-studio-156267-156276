import React from 'react';

/**
 * PUBLIC_INTERFACE
 * Shows accepted payment methods with simple icons.
 */
export default function Payments() {
  const methods = [
    { name: 'Cash', icon: '💵', note: 'Exact change appreciated' },
    { name: 'Venmo', icon: '📱', note: '@bright-nails' },
    { name: 'PayPal', icon: '💳', note: 'paypal.me/brightnails' },
    { name: 'Apple Pay', icon: '🍎', note: 'Tap to pay available' },
  ];
  return (
    <div className="payments">
      {methods.map(m => (
        <article key={m.name} className="pay-card" aria-label={m.name}>
          <div className="icon" aria-hidden="true">{m.icon}</div>
          <h3>{m.name}</h3>
          <p>{m.note}</p>
        </article>
      ))}
    </div>
  );
}
