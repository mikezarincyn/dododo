import React from 'react';

/**
 * ProgressBar — segmented developmental progress (as in the app's domain rows).
 * `filled` of `segments` lit in the status colour, plus an optional band label.
 */
export function ProgressBar({ filled = 2, segments = 6, status = 'typical', label, style = {} }) {
  const colors = {
    typical:  'var(--green-500)',
    building: 'var(--teal-500)',
    emerging: 'var(--confetti-yellow)',
    watch:    'var(--coral-500)',
  };
  const c = colors[status] || colors.typical;
  return (
    <div style={style}>
      <div style={{ display: 'flex', gap: 5 }}>
        {Array.from({ length: segments }).map((_, i) => (
          <span key={i} style={{
            flex: 1,
            height: 7,
            borderRadius: 'var(--radius-pill)',
            background: i < filled ? c : '#E7E9EB',
          }} />
        ))}
      </div>
      {label && (
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-muted)',
          marginTop: 8,
        }}>{label}</div>
      )}
    </div>
  );
}
