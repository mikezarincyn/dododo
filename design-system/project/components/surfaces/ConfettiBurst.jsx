import React from 'react';

/**
 * ConfettiBurst — sprinkles brand confetti shapes (dot / triangles / sparkle)
 * absolutely-positioned inside a relative parent. Decorative only.
 */
export function ConfettiBurst({ pieces = 'default', assetBase = '../../assets', style = {} }) {
  const presets = {
    default: [
      { src: 'confetti-dot-yellow.svg',     w: 22, top: '8%',  left: '4%' },
      { src: 'confetti-triangle-pink.svg',  w: 20, top: '4%',  left: '12%' },
      { src: 'confetti-triangle-blue.svg',  w: 20, top: '14%', left: '9%' },
    ],
    sparkles: [
      { src: 'sparkle.svg', w: 28, top: '12%', left: '5%' },
      { src: 'sparkle.svg', w: 22, top: '60%', left: '94%' },
    ],
  };
  const list = Array.isArray(pieces) ? pieces : (presets[pieces] || presets.default);
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', ...style }}>
      {list.map((p, i) => (
        <img
          key={i}
          src={`${assetBase}/${p.src}`}
          alt=""
          style={{ position: 'absolute', width: p.w, top: p.top, left: p.left, transform: 'translate(-50%, -50%)' }}
        />
      ))}
    </div>
  );
}
