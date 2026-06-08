import React from 'react';

/**
 * CheckItem — a bullet with a circular lilac check bubble (positive list)
 * or an outlined square cross (problem list). Title bold navy + optional body.
 */
export function CheckItem({ title, children, kind = 'check', style = {} }) {
  const isCheck = kind === 'check';
  return (
    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', ...style }}>
      <span
        style={{
          flexShrink: 0,
          width: 26,
          height: 26,
          marginTop: 2,
          borderRadius: isCheck ? '50%' : '6px',
          background: isCheck ? 'var(--lilac-100)' : 'transparent',
          border: isCheck ? 'none' : '1.5px solid rgba(43,42,42,.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isCheck ? 'var(--navy-700)' : 'rgba(43,42,42,.7)',
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        {isCheck ? '✓' : '✕'}
      </span>
      <div>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
          fontSize: '19px',
          color: isCheck ? 'var(--navy-700)' : 'var(--ink-900)',
          lineHeight: 1.3,
        }}>{title}</div>
        {children && (
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: '17px',
            lineHeight: 1.5,
            color: 'var(--text-muted)',
            marginTop: 4,
          }}>{children}</div>
        )}
      </div>
    </div>
  );
}
