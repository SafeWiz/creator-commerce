import * as React from "react";

/**
 * Badge — small pill for status and metadata (Draft / Published,
 * counts, categories). Fully rounded (4xl radius), 20px tall.
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** @default "default" */
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost";
  /** Show a leading status dot. @default false */
  dot?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function Badge(props: BadgeProps): React.JSX.Element;
