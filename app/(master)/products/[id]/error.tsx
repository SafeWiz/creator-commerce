"use client"

import { Button } from "@/components/ui/button"

export default function EditProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="font-heading text-xl font-medium">Something went wrong.</h1>
      <p className="max-w-[44ch] text-sm text-muted-foreground">
        The product couldn&apos;t be loaded. Try again, or head back to your
        products.
      </p>
      {error.digest && (
        <p className="font-mono text-[11px] text-muted-foreground">{error.digest}</p>
      )}
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
