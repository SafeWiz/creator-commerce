import type { Metadata } from "next"

import { users, storeProducts } from "@/lib/mock-data"
import { ProductCard } from "@/components/product-card"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Gabi Ionescu (@gabi)",
  description:
    "Digital products for photographers and creatives. Instant download after checkout.",
}

interface HandleParams {
  handle: string
}

export default async function StorefrontPage({ params }: { params: HandleParams}) {
  const { handle: uriEncodedHandle } = await params
  const handle = decodeURIComponent(uriEncodedHandle)
  const user = users.find(u => u.handle === handle)
  if (!user) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-[1080px] px-6 pt-8 pb-16">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-medium tracking-[-0.02em]">
          Presets, templates &amp; sounds by Gabi
        </h1>
        <p className="mt-1.5 max-w-[60ch] text-[15px] text-muted-foreground">
          Digital products for photographers and creatives. Instant download
          after checkout.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-5">
        {storeProducts.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </div>
  )
}
