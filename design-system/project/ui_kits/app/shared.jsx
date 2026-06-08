/* App UI kit — shared helpers */
const APP_ASSETS = '../../assets';

function Ico({ name, size = 22, color = 'currentColor', strokeWidth = 2 }) {
  return <i data-lucide={name} style={{ width: size, height: size, color, strokeWidth }}></i>;
}

/** Soft tinted illustration placeholder for activity cards. */
function ActThumb({ tone = '#F3DEDA' }) {
  return <div style={{ width: 64, height: 64, borderRadius: 14, background: `linear-gradient(135deg, ${tone}, #FBF6EF)`, flexShrink: 0 }} />;
}

window.Ico = Ico;
window.ActThumb = ActThumb;
window.APP_ASSETS = APP_ASSETS;
