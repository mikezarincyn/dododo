import React from 'react';

/**
 * Dododo Card — white rounded surface with soft shadow, floating on
 * tinted section backgrounds. Tones tint the whole card (challenge=grey,
 * solution=mint with green border).
 */
export function Card({ children, tone = 'white', padding = 28, style = {}, ...rest }) {
  const tones = {
    white:  { bg: 'var(--white)', border: 'var(--border-subtle)' },
    mint:   { bg: '#EAF7F1', border: 'var(--green-500)' },
    grey:   { bg: 'var(--grey-surface-100)', border: 'transparent' },
    yellow: { bg: 'var(--yellow-surface-100)', border: 'transparent' },
  };
  const t = tones[tone] || tones.white;
  return (
    <div
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: 'var(--radius-lg)',
        boxShadow: tone === 'white' ? 'var(--shadow-card)' : 'none',
        padding: typeof padding === 'number' ? `${padding}px` : padding,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
