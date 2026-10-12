"use client"

import { deltaBadge } from "@/components/kpi-card"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/currency"
import {
  EmptyLine,
  ResultCard,
  Row,
  RowList,
  Thumb,
  formatDate,
  useProductCovers,
} from "@/components/cece/cards/shared"
import type {
  GetSalesSummaryOutput,
  ListRecentSalesOutput,
} from "@/components/cece/cards/types"

const PERIOD_TITLES: Record<string, string> = {
  "7d": "Sales · last 7 days",
  "30d": "Sales · last 30 days",
  all: "Sales · all time",
}

function Tile({
  label,
  value,
  current,
  previous,
}: {
  label: string
  value: string
  current: number
  // Null for "all", which has no window before it to compare with.
  previous: number | null
}) {
  const badge = previous == null ? null : deltaBadge(current, previous)
  return (
    <div className="flex flex-1 flex-col gap-1 p-3">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        {label}
        {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
      </div>
      <div className="font-mono text-lg leading-none font-medium">{value}</div>
    </div>
  )
}

export function SalesSummaryCard({ output }: { output: GetSalesSummaryOutput }) {
  const covers = useProductCovers(output.topProducts.map((p) => p.productId))
  return (
    <ResultCard
      title={PERIOD_TITLES[output.period] ?? "Sales"}
      footer={{ label: "Open sales", href: "/sales" }}
    >
      <div className="flex divide-x border-b">
        <Tile
          label="Revenue"
          value={formatPrice(output.current.revenueInCents)}
          current={output.current.revenueInCents}
          previous={output.previous?.revenueInCents ?? null}
        />
        <Tile
          label="Units"
          value={String(output.current.units)}
          current={output.current.units}
          previous={output.previous?.units ?? null}
        />
      </div>
      {output.topProducts.length === 0 ? (
        <EmptyLine>No sales in this period.</EmptyLine>
      ) : (
        <RowList>
          {output.topProducts.map((p) => (
            <Row
              key={p.productId}
              href={p.editLink}
              thumb={<Thumb src={covers[p.productId]} alt={p.name} />}
              title={p.name}
              trailing={formatPrice(p.revenueInCents)}
            />
          ))}
        </RowList>
      )}
    </ResultCard>
  )
}

export function RecentSalesCard({ output }: { output: ListRecentSalesOutput }) {
  const covers = useProductCovers(output.sales.map((s) => s.productId))
  return (
    <ResultCard
      title="Recent sales"
      footer={{ label: "See all sales", href: output.allSalesLink }}
    >
      {output.sales.length === 0 ? (
        <EmptyLine>No sales yet.</EmptyLine>
      ) : (
        <RowList>
          {output.sales.map((s, i) => (
            <Row
              key={i}
              thumb={<Thumb src={covers[s.productId]} alt={s.productName} />}
              title={s.productName}
              meta={`${s.buyerName} · ${formatDate(s.soldAt)}`}
              trailing={formatPrice(s.priceInCents)}
            />
          ))}
        </RowList>
      )}
    </ResultCard>
  )
}
