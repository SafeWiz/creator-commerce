import { Table } from "@/components/ui/table"
import { cn } from "@/lib/utils"

// Data-table archetype: hairline-ring card wrapper + kit table metrics
// (11px uppercase headers, 52px rows).
export function TableCard({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10", className)}>
      <Table className="[&_td]:h-[52px] [&_td]:px-3 [&_th]:h-9 [&_th]:px-3 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:tracking-[0.05em] [&_th]:text-muted-foreground [&_th]:uppercase">
        {children}
      </Table>
    </div>
  )
}
