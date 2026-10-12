"use client"

import { formatPrice } from "@/lib/currency"
import { formatFileSize } from "@/lib/utils"
import {
  EmptyLine,
  ResultCard,
  Row,
  RowList,
  Thumb,
  formatDate,
  useProductCovers,
} from "@/components/cece/cards/shared"
import type {
  ListMyDownloadsOutput,
  ListMyPurchasesOutput,
} from "@/components/cece/cards/types"

export function PurchasesCard({ output }: { output: ListMyPurchasesOutput }) {
  const covers = useProductCovers(output.purchases.map((p) => p.productId))
  return (
    <ResultCard
      title="Your purchases"
      footer={{ label: "See all purchases", href: output.allPurchasesLink }}
    >
      {output.purchases.length === 0 ? (
        <EmptyLine>No purchases yet.</EmptyLine>
      ) : (
        <RowList>
          {output.purchases.map((p, i) => (
            <Row
              key={i}
              href={p.productLink}
              thumb={<Thumb src={covers[p.productId]} alt={p.productName} />}
              title={p.productName}
              meta={`@${p.sellerHandle} · ${formatDate(p.purchasedAt)}`}
              trailing={formatPrice(p.priceInCents)}
            />
          ))}
        </RowList>
      )}
    </ResultCard>
  )
}

export function DownloadsCard({ output }: { output: ListMyDownloadsOutput }) {
  const covers = useProductCovers(output.downloads.map((d) => d.productId))
  return (
    <ResultCard
      title="Your downloads"
      footer={{ label: "Go to downloads", href: output.downloadsLink }}
    >
      {output.downloads.length === 0 ? (
        <EmptyLine>Nothing to download yet.</EmptyLine>
      ) : (
        <RowList>
          {output.downloads.map((d, i) => (
            <Row
              key={i}
              thumb={<Thumb src={covers[d.productId]} alt={d.productName} />}
              title={d.productName}
              meta={`${d.fileName} · ${formatFileSize(d.fileSizeBytes)}`}
            />
          ))}
        </RowList>
      )}
    </ResultCard>
  )
}
