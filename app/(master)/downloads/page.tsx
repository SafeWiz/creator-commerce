import type { Metadata } from "next"
import {
  AudioLines,
  Download,
  FileText,
  Package,
  type LucideIcon,
} from "lucide-react"

import { downloads } from "@/lib/mock-data"
import { TableCard } from "@/components/table-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata: Metadata = {
  title: "Downloads",
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  ZIP: Package,
  PDF: FileText,
  Audio: AudioLines,
}

export default function DownloadsPage() {
  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-4 p-6">
      <div>
        <h1 className="font-heading text-2xl font-medium tracking-[-0.02em]">Downloads</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything you&apos;ve bought, ready to re-download anytime.
        </p>
      </div>

      <TableCard>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead>Purchased</TableHead>
            <TableHead className="w-32" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {downloads.map((item) => {
            const Icon = TYPE_ICONS[item.type]
            return (
              <TableRow key={item.product}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </span>
                    {item.product}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{item.type}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">
                  {item.size}
                </TableCell>
                <TableCell className="text-[13px] text-muted-foreground">
                  {item.purchased}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm">
                      <Download /> Download
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </TableCard>
    </div>
  )
}
