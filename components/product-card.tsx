import Link from "next/link"
import { AudioLines, FileText, Package, type LucideIcon } from "lucide-react"

import type { StoreProduct } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const TYPE_ICONS: Record<string, LucideIcon> = {
  ZIP: Package,
  PDF: FileText,
  Audio: AudioLines,
}

export function ProductCover({
  type,
  cover,
  className,
  iconClassName,
}: {
  type: string
  cover: string
  className?: string
  iconClassName?: string
}) {
  const Icon = TYPE_ICONS[type] ?? Package
  return (
    <div
      className={cn(
        "flex aspect-[3/2] items-center justify-center text-muted-foreground",
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${cover}, color-mix(in oklch, ${cover}, black 8%))`,
      }}
    >
      <Icon className={cn("size-[26px]", iconClassName)} />
    </div>
  )
}

export function ProductCard({ product }: { product: StoreProduct }) {
  return (
    <Link
      href={`/${product.handle}/${product.id}/${product.slug}`}
      className="flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow hover:ring-foreground/15"
    >
      <ProductCover type={product.type} cover={product.cover} />
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="font-heading text-[15px] font-medium">{product.name}</span>
          <Badge variant="outline">{product.type}</Badge>
        </div>
        <p className="flex-1 text-[13px] leading-normal text-muted-foreground">
          {product.blurb}
        </p>
        <span className="mt-1 font-mono text-base font-medium">{product.price}</span>
      </div>
    </Link>
  )
}
