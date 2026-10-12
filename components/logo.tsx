import { cn } from "@/lib/utils"

/**
 * The mark, drawn once. Every place the logo appears renders this component:
 * the app's headers, the OG cards (`lib/server/og/frame.tsx`), the favicon
 * (`app/icon.tsx`) and the home-screen icon (`app/apple-icon.tsx`).
 *
 * Without `colors` the arcs take the theme through Tailwind classes. Satori —
 * behind both the OG cards and the favicon — resolves neither classes nor
 * `var()`, so those callers pass literal hex instead. It stays a plain element
 * with no hooks for the same reason: Satori calls components directly.
 */
export function Logo({
  size = 32,
  colors,
}: {
  size?: number
  colors?: { foreground: string; primary: string }
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M17.5 12 A12 12 0 1 0 17.5 36"
        className={colors ? undefined : "stroke-foreground"}
        stroke={colors?.foreground}
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M21.5 16 A12 12 0 1 1 21.5 32"
        className={colors ? undefined : "stroke-primary"}
        stroke={colors?.primary}
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-heading font-medium tracking-[-0.02em]", className)}>
      Creator<b className="font-bold">Commerce</b>
    </span>
  )
}
