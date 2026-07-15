import { cn } from "@/lib/utils"

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M28 12 A12 12 0 1 0 28 36"
        className="stroke-foreground"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M32 16 A12 12 0 1 1 32 32"
        className="stroke-primary"
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
