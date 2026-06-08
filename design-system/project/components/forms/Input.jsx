import React from 'react';

/**
 * Dododo Input — soft rounded field with navy label. Calm focus ring (green).
 */
export function Input({ label, hint, type = 'text', value, onChange, placeholder, style = {}, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <label style={{ display: 'block', fontFamily: 'var(--font-body)', ...style }}>
      {label && (
        <span style={{
          display: 'block',
          fontWeight: 700,
          fontSize: 16,
          color: 'var(--navy-700)',
          marginBottom: 8,
        }}>{label}</span>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          height: 56,
          padding: '0 20px',
          borderRadius: 'var(--radius-md)',
          border: `1.5px solid ${focus ? 'var(--green-500)' : 'var(--border-subtle)'}`,
          background: 'var(--white)',
          fontFamily: 'var(--font-body)',
          fontSize: 18,
          color: 'var(--ink-900)',
          outline: 'none',
          boxShadow: focus ? '0 0 0 4px rgba(114,188,161,.18)' : 'none',
          transition: 'border-color .15s ease, box-shadow .15s ease',
        }}
        {...rest}
      />
      {hint && (
        <span style={{ display: 'block', fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>{hint}</span>
      )}
    </label>
  );
}
