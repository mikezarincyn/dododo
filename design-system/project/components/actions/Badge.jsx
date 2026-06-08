import React from 'react';

/**
 * Dododo Badge — small pill label. Used for "most popular" (coral),
 * eyebrow chips, and soft status tags.
 */
export function Badge({ children, tone = 'coral', style = {}, ...rest }) {
  const tones = {
    coral:  { bg: 'var(--coral-500)', color: 'var(--white)' },
    green:  { bg: 'var(--green-100)', color: 'var(--green-500)' },
    yellow: { bg: 'var(--yellow-surface-100)', color: '#9A7B23' },
    lilac:  { bg: 'var(--lilac-100)', color: 'var(--navy-700)' },
    navy:   { bg: 'var(--navy-700)', color: 'var(--white)' },
  };
  const t = tones[tone] || tones.coral;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '7px 16px',
        borderRadius: 'var(--radius-pill)',
        background: t.bg,
        color: t.color,
        fontFamily: 'var(--font-body)',
        fontWeight: 700,
        fontSize: '14px',
        letterSpacing: '0.01em',
        lineHeight: 1,
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
