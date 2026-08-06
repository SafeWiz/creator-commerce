import type { Metadata } from "next"
import { SearchX } from "lucide-react"

import { searchPublishedProducts } from "@/lib/server/dal/products"
import { requireUser } from "@/lib/server/session"
import { productSearchParamsSchema } from "@/lib/schemas/product"
import { ExploreSearchForm } from "@/components/explore-search-form"
import { ProductCard } from "@/components/product-card"

export const metadata: Metadata = {
  title: "Explore",
}

export default async function ExplorePage({
  searchParams,
}: PageProps<"/explore">) {
  const user = await requireUser()
  const parsed = productSearchParamsSchema.safeParse(await searchParams)
  const { q, sort } = parsed.success ? parsed.data : { q: "", sort: "newest" as const }

  const products = await searchPublishedProducts(q, sort, user.id)

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-4 p-6">
      <div>
        <h1 className="font-heading text-2xl font-medium tracking-[-0.02em]">
          Explore
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find digital products from every seller on the platform.
        </p>
      </div>

      <ExploreSearchForm q={q} sort={sort} />

      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <SearchX className="size-8 text-muted-foreground" />
          <p className="font-medium">No products found</p>
          <p className="text-sm text-muted-foreground">
            Try a different search term.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              handle={product.sellerHandle}
            />
          ))}
        </div>
      )}
    </div>
  )
}
