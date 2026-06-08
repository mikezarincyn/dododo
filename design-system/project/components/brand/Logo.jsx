import React from 'react';

/**
 * Dododo Logo — the lowercase wordmark SVG with confetti accents.
 * Point `assetBase` at the assets folder; size with `height`.
 */
export function Logo({ height = 40, assetBase = '../../assets', style = {}, ...rest }) {
  return (
    <img
      src={`${assetBase}/dododo-logo.svg`}
      alt="Dododo"
      style={{ height, width: 'auto', display: 'block', ...style }}
      {...rest}
    />
  );
}
