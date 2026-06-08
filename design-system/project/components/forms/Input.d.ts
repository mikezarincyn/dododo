import * as React from 'react';

/** Soft rounded text field with navy label and calm green focus ring. */
export interface InputProps {
  label?: string;
  hint?: string;
  type?: string;
  value?: string;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  style?: React.CSSProperties;
}
export function Input(props: InputProps): JSX.Element;
