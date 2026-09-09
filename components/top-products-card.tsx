import type * as React from "react"

import type { TopProduct } from "@/lib/server/dal/purchases"
import { formatPrice } from "@/lib/currency"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type TopProductsCardProps = {
  title: string
  description: string
  products: TopProduct[]
  /**
   * Every product's revenue over the same window, not just the listed ones.
   * Passed in rather than summed from `products` because these are the top N of
   * a longer list: summing the rows would stretch them to fill the card and make
   * the leader 100% of a total it does not represent. Bars that stop short of
   * the edge are the honest picture of a long tail.
   */
  totalRevenueInCents: number
  emptyMessage: string
  footer?: React.ReactNode
}

export function TopProductsCard({
  title,
  description,
  products,
  totalRevenueInCents,
  emptyMessage,
  footer,
}: TopProductsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3.5">
        {products.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">{emptyMessage}</p>
        ) : (
          products.map((product) => (
            <div key={product.productId} className="flex flex-col gap-1.5">
              <div className="flex justify-between gap-3 text-[13px]">
                <span className="truncate font-medium">{product.name}</span>
                <span className="shrink-0 font-mono text-muted-foreground">
                  {formatPrice(product.revenueInCents)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    // A non-empty list means the total is positive, so the guard
                    // is only for the impossible case; it is here so the style
                    // can never read "NaN%".
                    width:
                      totalRevenueInCents > 0
                        ? `${(product.revenueInCents / totalRevenueInCents) * 100}%`
                        : "0%",
                  }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  )
}
