import React from 'react';

/**
 * PUBLIC_INTERFACE
 * Instagram feed placeholder grid. If REACT_APP_INSTAGRAM_USERNAME is set,
 * displays a link to the profile. Real API integration requires tokens
 * and a backend; this component provides a clean fallback preview.
 */
export default function InstagramFeed() {
  const handle = process.env.REACT_APP_INSTAGRAM_USERNAME || '';
  const url = handle ? `https://instagram.com/${handle.replace('@','')}` : null;
  const items = Array.from({ length: 8 }, (_, i) => i);

  return (
    <div>
      <p className="subtitle" style={{ textAlign: 'center' }}>
        {url ? (
          <>Follow us on Instagram: <a href={url} target="_blank" rel="noreferrer">@{handle.replace('@','')}</a></>
        ) : (
          <>Add REACT_APP_INSTAGRAM_USERNAME in .env to link your profile.</>
        )}
      </p>
      <div className="ig-grid" aria-label="Instagram preview">
        {items.map(i => (
          <div className="ig-item" key={i} aria-hidden="true" />
        ))}
      </div>
    </div>
  );
}
