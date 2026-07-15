import type { Metadata } from "next"
import Link from "next/link"
import { Download } from "lucide-react"

import { purchases } from "@/lib/mock-data"
import { TableCard } from "@/components/table-card"
import { Button } from "@/components/ui/button"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export const metadata: Metadata = {
  title: "Purchases",
}

export default function PurchasesPage() {
  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-4 p-6">
      <div>
        <h1 className="font-heading text-2xl font-medium tracking-[-0.02em]">Purchases</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your order history and receipts. Files live in Downloads.
        </p>
      </div>

      <TableCard>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Creator</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Receipt</TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchases.map((purchase) => (
            <TableRow key={purchase.product}>
              <TableCell className="font-medium">{purchase.product}</TableCell>
              <TableCell className="font-mono text-[13px] text-muted-foreground">
                {purchase.creator}
              </TableCell>
              <TableCell className="text-[13px] text-muted-foreground">
                {purchase.date}
              </TableCell>
              <TableCell className="text-right font-mono">{purchase.amount}</TableCell>
              <TableCell>
                <a href="#" className="text-[13px] text-primary hover:underline">
                  View
                </a>
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          nativeButton={false}
                          render={<Link href="/downloads" />}
                        >
                          <Download className="size-3.5" />
                        </Button>
                      }
                    />
                    <TooltipContent>Go to downloads</TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableCard>
    </div>
  )
}
