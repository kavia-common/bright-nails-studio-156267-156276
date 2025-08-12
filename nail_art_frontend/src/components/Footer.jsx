import React from 'react';

/**
 * PUBLIC_INTERFACE
 * Site footer with social and payment info.
 */
export default function Footer() {
  return (
    <footer className="footer">
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>© {new Date().getFullYear()} Bright Nails Studio</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="#payments">Cash</a>
          <a href="#payments">Venmo</a>
          <a href="#payments">PayPal</a>
          <a href="#payments">Apple Pay</a>
        </div>
      </div>
    </footer>
  );
}
