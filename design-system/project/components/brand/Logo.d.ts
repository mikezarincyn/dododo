import * as React from 'react';

/** The Dododo lowercase wordmark with confetti accents. */
export interface LogoProps {
  /** px height. @default 40 */
  height?: number;
  /** relative path to the assets folder. @default "../../assets" */
  assetBase?: string;
  style?: React.CSSProperties;
}
export function Logo(props: LogoProps): JSX.Element;
