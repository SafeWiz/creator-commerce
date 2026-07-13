import * as React from "react";

/**
 * Input — single-line text field (or multi-line via asTextarea). 32px
 * tall, 7px radius, hairline border, 3px focus ring. Set aria-invalid
 * for the destructive error state.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Render a resizable <textarea> instead of <input>. @default false */
  asTextarea?: boolean;
  className?: string;
}

export function Input(props: InputProps): React.JSX.Element;
