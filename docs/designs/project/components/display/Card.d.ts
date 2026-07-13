import * as React from "react";

/**
 * Card — surface container for grouped content (KPI tiles, product
 * cards, form panels). Hairline ring (not a heavy shadow), 10px
 * radius, 16px internal spacing (12px when size="sm"). A leading
 * <img> bleeds to the top corners; a CardFooter gets a muted top-bordered bar.
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Compact spacing. @default "default" */
  size?: "default" | "sm";
  className?: string;
  children?: React.ReactNode;
}

export function Card(props: CardProps): React.JSX.Element;
export function CardHeader(props: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element;
export function CardTitle(props: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element;
export function CardDescription(props: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element;
/** Top-right slot in the header (e.g. a menu button or badge). */
export function CardAction(props: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element;
export function CardContent(props: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element;
export function CardFooter(props: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element;
