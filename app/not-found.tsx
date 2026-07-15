import Link from "next/link"
import { X } from "lucide-react"

import { CenteredCardShell } from "@/components/layouts/centered-card-shell"
import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"

export default function NotFound() {
  return (
    <CenteredCardShell>
      <CardContent className="flex flex-col items-center gap-3.5 text-center">
        <span className="flex size-13 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <X className="size-6.5" />
        </span>
        <h1 className="font-heading text-xl font-medium">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          This page doesn&apos;t exist or has moved.
        </p>
        <Button className="w-full" nativeButton={false} render={<Link href="/" />}>
          Back to home
        </Button>
      </CardContent>
    </CenteredCardShell>
  )
}
