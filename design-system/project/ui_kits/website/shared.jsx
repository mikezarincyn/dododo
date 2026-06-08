/* Shared helpers for the website UI kit */
const ASSETS = '../../assets';

/** Soft tinted image placeholder (no real brand photos supplied). */
function Photo({ label = 'Parent & child photo', radius = 24, height = '100%', tone = '#E7EFF9', style = {} }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${tone}, #F4F1EC)`,
      borderRadius: radius,
      height,
      width: '100%',
      display: 'flex',
      alignItems: 'flex-end',
      padding: 18,
      boxSizing: 'border-box',
      color: 'rgba(43,42,42,.45)',
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: '.02em',
      ...style,
    }}>{label}</div>
  );
}

/** Round avatar placeholder. */
function Avatar({ size = 56, tone = '#D8E6F2' }) {
  return <div style={{ width: size, height: size, borderRadius: '50%', background: tone, flexShrink: 0 }} />;
}

window.Photo = Photo;
window.Avatar = Avatar;
window.ASSETS = ASSETS;
