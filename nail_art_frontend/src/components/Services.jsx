import React from 'react';

const services = [
  { name: 'Mini Mani', desc: 'Quick clean-up + simple polish', price: 10, emoji: '💅' },
  { name: 'Glitter Glam', desc: 'Sparkly polish with accent nails', price: 15, emoji: '✨' },
  { name: 'Character Cuties', desc: 'Hand-painted cute character nails', price: 20, emoji: '🎀' },
  { name: 'Minimal Chic', desc: 'Clean lines, modern patterns', price: 18, emoji: '🟣' },
  { name: 'Mix & Match', desc: 'Combine styles to fit your vibe', price: 22, emoji: '🎨' },
  { name: 'Bestie Set', desc: 'Matching designs for two friends', price: 30, emoji: '👯' },
];

/**
 * PUBLIC_INTERFACE
 * Services grid with prices and descriptions.
 */
export default function Services() {
  return (
    <div className="cards">
      {services.map((s) => (
        <article className="card" key={s.name}>
          <div className="badge" aria-hidden="true">{s.emoji}</div>
          <h3>{s.name}</h3>
          <p>{s.desc}</p>
          <p className="price">${s.price}</p>
        </article>
      ))}
    </div>
  );
}
