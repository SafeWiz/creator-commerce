import * as React from "react";

/**
 * Tooltip — hover/focus label on a dark (foreground-colored) popup with
 * an arrow. Wrap the trigger; pass the label via `content`.
 */
export interface TooltipProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Tooltip label. */
  content: React.ReactNode;
  /** @default "top" */
  side?: "top" | "bottom";
  className?: string;
  children?: React.ReactNode;
}

export function Tooltip(props: TooltipProps): React.JSX.Element;
