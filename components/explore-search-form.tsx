"use client"

import { useRef } from "react"
import { Search } from "lucide-react"

import type { ProductSearchParams } from "@/lib/schemas/product"
import { Input } from "@/components/ui/input"

const MIN_SEARCH_QUERY_LENGTH = 3

export function ExploreSearchForm({ q, sort }: ProductSearchParams) {
  const formRef = useRef<HTMLFormElement>(null)
  const trimmedLength = q.trim().length
  const showHint = trimmedLength > 0 && trimmedLength < MIN_SEARCH_QUERY_LENGTH

  return (
    <div className="flex flex-col gap-1.5">
      <form ref={formRef} method="get" className="flex items-center gap-2.5">
        <div className="relative w-[280px]">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-[15px] -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search products…"
            className="pl-8"
          />
        </div>
        <select
          name="sort"
          defaultValue={sort}
          onChange={() => formRef.current?.requestSubmit()}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="newest">Sort: Newest first</option>
          <option value="oldest">Sort: Oldest first</option>
        </select>
      </form>
      {showHint && (
        <p className="text-[13px] text-muted-foreground">
          Type at least {MIN_SEARCH_QUERY_LENGTH} characters to search by
          text — showing all products for now.
        </p>
      )}
    </div>
  )
}
