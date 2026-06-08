import * as React from 'react';

/**
 * Dododo pill button — the core action element.
 * @startingPoint section="Actions" subtitle="Pill button — primary / secondary / outline / soft" viewport="700x180"
 */
export interface ButtonProps {
  children: React.ReactNode;
  /** Visual style. @default "primary" */
  variant?: 'primary' | 'secondary' | 'outline' | 'soft';
  /** @default "lg" (72px) — "sm" is 54px */
  size?: 'lg' | 'sm';
  /** UPPERCASE + wide tracking, as in the nav CTA. @default false */
  uppercase?: boolean;
  /** Optional element rendered after the label (e.g. an arrow). */
  iconRight?: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function Button(props: ButtonProps): JSX.Element;
