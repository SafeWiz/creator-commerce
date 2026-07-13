import * as React from "react";

/** Separator — 1px hairline divider, horizontal or vertical. */
export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** @default "horizontal" */
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Separator(props: SeparatorProps): React.JSX.Element;
