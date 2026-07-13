import * as React from "react";

/**
 * Button — the primary action control. base-nova style: compact (32px
 * default), 7px radius, medium weight, subtle press translate.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. @default "default" */
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  /** Control size. Icon-only sizes render a square. @default "default" */
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";
  className?: string;
  children?: React.ReactNode;
}

export function Button(props: ButtonProps): React.JSX.Element;
