"use client"

import { BadgeCheck, CircleAlert } from "lucide-react"

import { ResultCard, SafeLink } from "@/components/cece/cards/shared"
import type { GetAccountStatusOutput } from "@/components/cece/cards/types"

// Each suggestion as a link to where it is acted on. The storefront entry is
// filled from the output at render time.
const NEXT_STEPS: Record<string, { label: string; href: string | null }> = {
  "create-first-product": { label: "Create your first product", href: "/products/new" },
  "publish-a-draft": { label: "Publish a draft", href: "/products" },
  "share-storefront": { label: "Share your storefront", href: null },
}

export function AccountStatusCard({ output }: { output: GetAccountStatusOutput }) {
  const next = NEXT_STEPS[output.suggestedNextStep]
  return (
    <ResultCard title="Your account">
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <SafeLink
            href={output.storefrontLink}
            className="truncate font-medium text-primary underline underline-offset-2"
          >
            @{output.handle}
          </SafeLink>
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            {output.emailVerified ? (
              <>
                <BadgeCheck className="size-3.5" /> Email verified
              </>
            ) : (
              <>
                <CircleAlert className="size-3.5" /> Email not verified
              </>
            )}
          </span>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>
            <span className="font-mono text-foreground">{output.products.published}</span> published
          </span>
          <span>
            <span className="font-mono text-foreground">{output.products.drafts}</span> drafts
          </span>
          <span>{output.hasFirstSale ? "Has sales" : "No sales yet"}</span>
        </div>
        {next && (
          <SafeLink
            href={next.href ?? output.storefrontLink}
            className="w-fit text-xs font-medium text-primary underline underline-offset-2"
          >
            Next: {next.label}
          </SafeLink>
        )}
      </div>
    </ResultCard>
  )
}
