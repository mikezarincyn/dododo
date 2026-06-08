import * as React from 'react';

/** White rounded surface with soft shadow, floating on tinted sections. */
export interface CardProps {
  children: React.ReactNode;
  /** @default "white" — "mint" adds a green border (the with-dododo card) */
  tone?: 'white' | 'mint' | 'grey' | 'yellow';
  /** px or CSS string. @default 28 */
  padding?: number | string;
  style?: React.CSSProperties;
}

export function Card(props: CardProps): JSX.Element;

/** Decorative confetti scatter, absolutely positioned inside a relative parent. */
export interface ConfettiBurstProps {
  /** Named preset or an explicit array of pieces. @default "default" */
  pieces?: 'default' | 'sparkles' | Array<{ src: string; w: number; top: string; left: string }>;
  /** Relative path to the assets folder. @default "../../assets" */
  assetBase?: string;
  style?: React.CSSProperties;
}

export function ConfettiBurst(props: ConfettiBurstProps): JSX.Element;
