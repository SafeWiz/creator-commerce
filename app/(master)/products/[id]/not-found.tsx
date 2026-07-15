import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function ProductNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="font-heading text-xl font-medium">Product not found.</h1>
      <p className="max-w-[44ch] text-sm text-muted-foreground">
        This product doesn&apos;t exist or was deleted.
      </p>
      <Button variant="outline" nativeButton={false} render={<Link href="/products" />}>
        Back to products
      </Button>
    </div>
  )
}
