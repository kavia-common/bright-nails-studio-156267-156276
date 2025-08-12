import React from 'react';

/**
 * PUBLIC_INTERFACE
 * Frequently asked questions with collapsible answers.
 */
export default function FAQ() {
  const qas = [
    { q: 'How long does an appointment take?', a: '30–75 minutes depending on the design.' },
    { q: 'Is everything sanitized?', a: 'Yes! Tools and surfaces are cleaned and sanitized for each client.' },
    { q: 'Can I bring a photo of a design?', a: 'Absolutely! References help match your vision.' },
    { q: 'What if I need to cancel?', a: 'Please let us know at least 24 hours in advance if possible.' },
  ];
  return (
    <div className="faq">
      {qas.map((qa, i) => (
        <details key={i}>
          <summary><strong>{qa.q}</strong></summary>
          <p>{qa.a}</p>
        </details>
      ))}
    </div>
  );
}
