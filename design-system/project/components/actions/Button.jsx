import React from 'react';

/**
 * Dododo Button — fully-rounded pill, the core action element.
 * Variants: primary (solid green), secondary (solid teal),
 * outline (ink stroke on white), soft (green-100 with green text).
 */
export function Button({
  children,
  variant = 'primary',
  size = 'lg',
  uppercase = false,
  iconRight = null,
  disabled = false,
  onClick,
  style = {},
  ...rest
}) {
  const palettes = {
    primary:   { bg: 'var(--green-500)', color: 'var(--white)', border: 'transparent', hoverBg: 'var(--green-400)' },
    secondary: { bg: 'var(--teal-500)',  color: 'var(--white)', border: 'transparent', hoverBg: 'var(--teal-400)' },
    outline:   { bg: 'transparent',      color: 'var(--ink-900)', border: 'var(--ink-900)', hoverBg: 'var(--grey-surface-100)' },
    soft:      { bg: 'var(--green-100)',  color: 'var(--green-500)', border: 'transparent', hoverBg: '#CDEEDF' },
  };
  const p = palettes[variant] || palettes.primary;
  const [hover, setHover] = React.useState(false);

  const height = size === 'sm' ? 'var(--btn-height-sm)' : 'var(--btn-height)';
  const fontSize = size === 'sm' ? '16px' : 'var(--font-button)';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        minHeight: height,
        padding: `0 var(--btn-pad-x)`,
        borderRadius: 'var(--radius-pill)',
        border: `var(--border-width) solid ${p.border}`,
        background: disabled ? '#D9DCDE' : (hover ? p.hoverBg : p.bg),
        color: disabled ? 'rgba(43,42,42,.45)' : p.color,
        fontFamily: 'var(--font-body)',
        fontWeight: 700,
        fontSize,
        letterSpacing: uppercase ? 'var(--ls-button)' : '0.01em',
        textTransform: uppercase ? 'uppercase' : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background .18s ease, transform .12s ease',
        transform: hover && !disabled ? 'translateY(-1px)' : 'none',
        boxShadow: variant === 'primary' && !disabled ? 'var(--shadow-pill)' : 'none',
        ...style,
      }}
      {...rest}
    >
      {children}
      {iconRight && <span style={{ display: 'inline-flex' }}>{iconRight}</span>}
    </button>
  );
}
