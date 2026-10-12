"use client"

import { DraftBadge } from "@/components/product-card"
import { formatPrice } from "@/lib/currency"
import { formatFileSize } from "@/lib/utils"
import {
  EmptyLine,
  ResultCard,
  Row,
  RowList,
  SafeLink,
  Thumb,
  useProductCovers,
} from "@/components/cece/cards/shared"
import type {
  GetMyProductOutput,
  ListMyProductsOutput,
  SearchMarketplaceOutput,
} from "@/components/cece/cards/types"

export function MyProductsCard({ output }: { output: ListMyProductsOutput }) {
  const covers = useProductCovers(output.products.map((p) => p.id))
  return (
    <ResultCard
      title="Your products"
      footer={
        output.truncated
          ? { label: "See all products", href: "/products" }
          : undefined
      }
    >
      {output.products.length === 0 ? (
        <EmptyLine>No products found.</EmptyLine>
      ) : (
        <RowList>
          {output.products.map((p) => (
            <Row
              key={p.id}
              href={p.editLink}
              thumb={<Thumb src={covers[p.id]} alt={p.name} />}
              title={p.name}
              meta={p.status === "draft" ? <DraftBadge /> : "Published"}
              trailing={formatPrice(p.priceInCents)}
            />
          ))}
        </RowList>
      )}
    </ResultCard>
  )
}

export function MyProductCard({ output }: { output: GetMyProductOutput }) {
  const covers = useProductCovers(output.found ? [output.id] : [])
  if (!output.found) {
    return (
      <ResultCard title="Product">
        <EmptyLine>No product with that id in your catalogue.</EmptyLine>
      </ResultCard>
    )
  }
  return (
    <ResultCard title="Product">
      <div className="flex gap-3 p-3">
        <Thumb src={covers[output.id]} alt={output.name} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium">{output.name}</span>
            <span className="shrink-0 font-mono text-xs">
              {formatPrice(output.priceInCents)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {output.status === "draft" ? <DraftBadge /> : <span>Published</span>}
            <span>
              {output.hasFile && output.fileName
                ? `${output.fileName}${output.fileSizeBytes != null ? ` · ${formatFileSize(output.fileSizeBytes)}` : ""}`
                : "No file"}
            </span>
          </div>
          <div className="mt-1 flex gap-3 text-xs font-medium">
            <SafeLink href={output.editLink} className="text-primary underline underline-offset-2">
              Edit
            </SafeLink>
            {output.status === "published" && (
              <SafeLink href={output.pageLink} className="text-primary underline underline-offset-2">
                View page
              </SafeLink>
            )}
          </div>
        </div>
      </div>
    </ResultCard>
  )
}

export function MarketplaceCard({ output }: { output: SearchMarketplaceOutput }) {
  // Older histories predate `id` on these results; those rows keep the
  // placeholder.
  const covers = useProductCovers(output.results.map((r) => r.id))
  return (
    <ResultCard
      title="Marketplace"
      footer={{ label: "See all on Explore", href: output.exploreLink }}
    >
      {output.results.length === 0 ? (
        <EmptyLine>No products found.</EmptyLine>
      ) : (
        <RowList>
          {output.results.map((r, i) => (
            <Row
              key={r.id ?? i}
              href={r.link}
              thumb={<Thumb src={covers[r.id]} alt={r.name} />}
              title={r.name}
              meta={`@${r.sellerHandle}`}
              trailing={formatPrice(r.priceInCents)}
            />
          ))}
        </RowList>
      )}
    </ResultCard>
  )
}
