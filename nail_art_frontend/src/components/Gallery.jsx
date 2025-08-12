import React, { useMemo, useState } from 'react';

const items = [
  { id: 1, style: 'Cute Characters' },
  { id: 2, style: 'Glitter Glam' },
  { id: 3, style: 'Minimal Chic' },
  { id: 4, style: 'Glitter Glam' },
  { id: 5, style: 'Cute Characters' },
  { id: 6, style: 'Minimal Chic' },
  { id: 7, style: 'Glitter Glam' },
  { id: 8, style: 'Cute Characters' },
  { id: 9, style: 'Minimal Chic' },
];

/**
 * PUBLIC_INTERFACE
 * Simple filterable gallery grid using decorative placeholders.
 */
export default function Gallery() {
  const [filter, setFilter] = useState('All');
  const styles = ['All', 'Cute Characters', 'Glitter Glam', 'Minimal Chic'];

  const filtered = useMemo(() => {
    if (filter === 'All') return items;
    return items.filter(i => i.style === filter);
  }, [filter]);

  return (
    <div>
      <div className="gallery-filters" role="tablist" aria-label="Gallery filters">
        {styles.map(s => (
          <button
            key={s}
            className={`btn ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(s)}
            role="tab"
            aria-selected={filter === s}
            type="button"
          >
            {s}
          </button>
        ))}
      </div>
      <div className="gallery-grid">
        {filtered.map(i => (
          <figure className="thumb" key={i.id} aria-label={`${i.style} sample`}>
            <figcaption className="style-label">{i.style}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
