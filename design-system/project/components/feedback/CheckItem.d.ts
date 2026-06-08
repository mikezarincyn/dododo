import * as React from 'react';

/** Bulleted list item: lilac check bubble (positive) or outlined cross (problem). */
export interface CheckItemProps {
  title: React.ReactNode;
  children?: React.ReactNode;
  /** @default "check" — "cross" for problem lists */
  kind?: 'check' | 'cross';
  style?: React.CSSProperties;
}
export function CheckItem(props: CheckItemProps): JSX.Element;

/** Segmented developmental progress bar with optional band label. */
export interface ProgressBarProps {
  /** lit segments. @default 2 */
  filled?: number;
  /** total segments. @default 6 */
  segments?: number;
  /** @default "typical" */
  status?: 'typical' | 'building' | 'emerging' | 'watch';
  label?: string;
  style?: React.CSSProperties;
}
export function ProgressBar(props: ProgressBarProps): JSX.Element;
