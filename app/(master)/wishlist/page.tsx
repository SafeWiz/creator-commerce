import type { Metadata } from "next"

import { storeProducts } from "@/lib/mock-data"
import { ProductCard } from "@/components/product-card"

export const metadata: Metadata = {
  title: "Wishlist",
}

export default function WishlistPage() {
  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-4 p-6">
      <div>
        <h1 className="font-heading text-2xl font-medium tracking-[-0.02em]">Wishlist</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Products you saved from storefronts.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-5">
        {storeProducts.slice(0, 3).map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </div>
  )
}
