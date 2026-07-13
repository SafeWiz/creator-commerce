import * as React from "react";

/**
 * Label — form field label. Nunito Sans medium, 14px, dims when the
 * associated control is disabled.
 */
export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Dim + disable pointer events. @default false */
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function Label(props: LabelProps): React.JSX.Element;
