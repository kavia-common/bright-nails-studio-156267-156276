import React from 'react';

const testimonials = [
  { name: 'Ava, age 11', text: 'My glitter nails were perfect for the party!' },
  { name: 'Max, age 13', text: 'The character art was so cool and detailed.' },
  { name: 'Parent', text: 'Clean, kind, and very creative. Highly recommend.' },
];

/**
 * PUBLIC_INTERFACE
 * Testimonials section showcasing feedback.
 */
export default function Testimonials() {
  return (
    <div className="testimonials" aria-label="Client testimonials">
      {testimonials.map((t, i) => (
        <blockquote className="testi" key={i}>
          <p>“{t.text}”</p>
          <footer>— {t.name}</footer>
        </blockquote>
      ))}
    </div>
  );
}
