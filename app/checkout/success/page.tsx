import type { Metadata } from "next"
import { Check, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Payment confirmed",
}

export default function CheckoutSuccessPage() {
  return (
    <CardContent className="flex flex-col items-center gap-3.5 text-center">
      <span className="flex size-13 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Check className="size-6.5" />
      </span>
      <h1 className="font-heading text-xl font-medium">Payment confirmed</h1>
      <p className="text-sm text-muted-foreground">
        Thanks! <b className="text-foreground">Golden Hour Presets</b> is ready
        to download.
      </p>
      <Button className="w-full">
        <Download /> Go to downloads
      </Button>
    </CardContent>
  )
}
