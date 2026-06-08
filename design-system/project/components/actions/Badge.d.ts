import * as React from 'react';

/** Small pill label / status chip. */
export interface BadgeProps {
  children: React.ReactNode;
  /** @default "coral" — coral is reserved for "most popular" */
  tone?: 'coral' | 'green' | 'yellow' | 'lilac' | 'navy';
  style?: React.CSSProperties;
}

export function Badge(props: BadgeProps): JSX.Element;
