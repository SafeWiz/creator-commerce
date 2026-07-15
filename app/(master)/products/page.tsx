import type { Metadata } from "next"
import Link from "next/link"
import {
  AudioLines,
  Copy,
  FileText,
  Package,
  Pencil,
  Plus,
  Search,
  type LucideIcon,
} from "lucide-react"

import { products } from "@/lib/mock-data"
import { TableCard } from "@/components/table-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  title: "Products",
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  ZIP: Package,
  PDF: FileText,
  Audio: AudioLines,
}

const FILTERS = ["All", "Published", "Draft"]

export default function ProductsPage() {
  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-4 p-6">
      <div className="flex items-end gap-3">
        <div>
          <h1 className="font-heading text-2xl font-medium tracking-[-0.02em]">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {products.length} products · 3 drafts
          </p>
        </div>
        <div className="flex-1" />
        <Button nativeButton={false} render={<Link href="/products/new" />}>
          <Plus /> New product
        </Button>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="relative w-[280px]">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-[15px] -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search products…" className="pl-8" />
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-[3px]">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              className={
                filter === "All"
                  ? "h-[26px] rounded-md bg-background px-3 text-[13px] font-medium ring-1 ring-foreground/10"
                  : "h-[26px] rounded-md px-3 text-[13px] font-medium text-muted-foreground"
              }
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <TableCard>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Sold</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const Icon = TYPE_ICONS[product.type]
            return (
              <TableRow key={product.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </span>
                    <span className="max-w-[320px] truncate">{product.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{product.type}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono">{product.price}</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">
                  {product.sold}
                </TableCell>
                <TableCell>
                  <Badge variant={product.status === "Published" ? "default" : "secondary"}>
                    {product.status === "Draft" && (
                      <span className="size-1.5 rounded-full bg-muted-foreground" />
                    )}
                    {product.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-[13px] text-muted-foreground">
                  {product.updated}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            nativeButton={false}
                            render={<Link href={`/products/${product.id}`} />}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        }
                      />
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button variant="ghost" size="icon-sm">
                            <Copy className="size-3.5" />
                          </Button>
                        }
                      />
                      <TooltipContent>Duplicate</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </TableCard>

      <div className="flex items-center justify-between text-[13px] text-muted-foreground">
        <span>
          Showing {products.length} of {products.length}
        </span>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
