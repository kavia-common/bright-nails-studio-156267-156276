import React from 'react';

const steps = [
  { title: 'Pick Your Style', desc: 'Browse the gallery or bring a reference.' },
  { title: 'Prep & Clean', desc: 'Hands are sanitized; nails are shaped gently.' },
  { title: 'Base & Art', desc: 'Base coat, color, then your chosen design.' },
  { title: 'Top Coat', desc: 'Glossy finish to protect and shine.' },
  { title: 'Care Tips', desc: 'Leave with tips to keep your nails sparkling!' },
];

/**
 * PUBLIC_INTERFACE
 * The process explained as friendly steps.
 */
export default function Process() {
  return (
    <ol className="cards" aria-label="Steps of the nail art process">
      {steps.map(s => (
        <li className="card" key={s.title}>
          <h3>{s.title}</h3>
          <p>{s.desc}</p>
        </li>
      ))}
    </ol>
  );
}
