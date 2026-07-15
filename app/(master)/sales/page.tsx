import type { Metadata } from "next"

import { kpis, sales } from "@/lib/mock-data"
import { TableCard } from "@/components/table-card"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata: Metadata = {
  title: "Sales",
}

export default function SalesPage() {
  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-4 p-6">
      <div>
        <h1 className="font-heading text-2xl font-medium tracking-[-0.02em]">Sales</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Orders across your storefront, most recent first.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {kpis.slice(0, 2).map((kpi) => (
          <Card key={kpi.label} size="sm">
            <CardHeader>
              <CardDescription>{kpi.label}</CardDescription>
              {kpi.delta && (
                <CardAction>
                  <Badge variant={kpi.up ? "default" : "destructive"}>{kpi.delta}</Badge>
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              <div className="font-mono text-3xl leading-none font-medium tracking-[-0.02em]">
                {kpi.value}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{kpi.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TableCard>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Buyer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale) => (
            <TableRow key={sale.order}>
              <TableCell className="font-mono text-[13px] text-muted-foreground">
                {sale.order}
              </TableCell>
              <TableCell className="font-medium">{sale.product}</TableCell>
              <TableCell className="text-muted-foreground">{sale.buyer}</TableCell>
              <TableCell className="text-[13px] text-muted-foreground">{sale.date}</TableCell>
              <TableCell className="text-right font-mono">{sale.amount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableCard>
    </div>
  )
}
