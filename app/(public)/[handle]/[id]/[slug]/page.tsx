import type { Metadata } from "next"
import Link from "next/link"
import {
  ChevronLeft,
  FileCheck,
  Heart,
  InfinityIcon,
  Receipt,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react"

import { storeProducts } from "@/lib/mock-data"
import { ProductCover } from "@/components/product-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export async function generateMetadata({
  params,
}: PageProps<"/[handle]/[id]/[slug]">): Promise<Metadata> {
  const { id } = await params
  const product = storeProducts.find((p) => p.id === id) ?? storeProducts[0]
  return { title: product.name, description: product.blurb }
}

export default async function ProductPage({
  params,
}: PageProps<"/[handle]/[id]/[slug]">) {
  const { handle, id } = await params
  // Static mock: unknown ids fall back to the first product; notFound()
  // wiring comes with real data. The slug segment is decorative.
  const product = storeProducts.find((p) => p.id === id) ?? storeProducts[0]
  return (
    <div className="mx-auto max-w-[1080px] px-6 pt-6 pb-16">
      <Link
        href={`/${handle}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-[15px]" /> All products
      </Link>
      <div className="grid grid-cols-[1.2fr_1fr] items-start gap-8">
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <ProductCover
            type={product.type}
            cover={product.cover}
            className="aspect-[16/10]"
            iconClassName="size-10"
          />
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <Badge variant="outline" className="mb-2.5">
              {product.type}
            </Badge>
            <h1 className="font-heading text-[28px] leading-tight font-medium tracking-[-0.02em]">
              {product.name}
            </h1>
            <p className="mt-2.5 font-mono text-2xl font-medium">{product.price}</p>
          </div>
          <p className="text-[15px] leading-relaxed">
            {product.blurb} Delivered as an instant download the moment your
            payment clears — buy once, keep forever.
          </p>
          <div className="flex gap-2.5">
            <Button size="lg" className="flex-1">
              <ShoppingCart /> Buy now — {product.price}
            </Button>
            <Button size="lg" variant="outline">
              <Heart />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <ShieldCheck className="size-[15px]" />
            Secure checkout via Stripe · protected download
          </div>
          <Separator />
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              What&apos;s inside
            </p>
            <div className="flex items-center gap-2.5 text-sm">
              <FileCheck className="size-4" /> {product.type} asset · instant download
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <InfinityIcon className="size-4" /> Lifetime access &amp; re-downloads
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <Receipt className="size-4" /> Receipt emailed to you
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
