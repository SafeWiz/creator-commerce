import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export type KpiBadge = {
  label: string
  variant: "default" | "destructive" | "secondary"
}

/**
 * A delta is a comparison, and a comparison needs both sides.
 *
 * With no prior window there is no percentage to compute: dividing by zero is
 * undefined, and both "+100%" and "+∞%" would be inventions sitting next to real
 * numbers. "New" is the true statement — this is the first window with sales.
 * When neither window has any, there is nothing to say at all.
 */
export function deltaBadge(current: number, previous: number): KpiBadge | null {
  if (previous === 0) {
    return current > 0 ? { label: "New", variant: "secondary" } : null
  }

  const change = ((current - previous) / previous) * 100
  const up = change >= 0

  return {
    // toFixed already prints the minus sign; only the plus needs adding.
    label: `${up ? "+" : ""}${change.toFixed(1)}%`,
    variant: up ? "default" : "destructive",
  }
}

/**
 * Extracted from the dashboard page when Conversion started arriving on its own
 * schedule. The other three KPIs come from Drizzle in the same render; this one
 * comes from PostHog behind a Suspense boundary, and both have to look
 * identical while one of them is still loading.
 */
export function KpiCard({
  label,
  value,
  sub,
  badge,
}: {
  label: string
  value: string
  sub: string
  badge?: KpiBadge | null
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        {badge && (
          <CardAction>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <div className="font-mono text-3xl leading-none font-medium tracking-[-0.02em]">
          {value}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  )
}

/**
 * The same card with the value bar greyed out. Label and sub are real rather
 * than skeletal, because they are known before the query returns and a card
 * that already says "Conversion / visitors" does not reflow when it fills.
 */
export function KpiCardSkeleton({
  label,
  sub,
}: {
  label: string
  sub: string
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[30px] w-20 animate-pulse rounded bg-muted" />
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  )
}
