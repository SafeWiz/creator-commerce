import * as React from "react";

/** Skeleton — pulsing muted placeholder shown while data loads. Size it with width/height. */
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton(props: SkeletonProps): React.JSX.Element;
