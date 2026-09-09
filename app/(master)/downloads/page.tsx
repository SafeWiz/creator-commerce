import type { Metadata } from "next"
import Link from "next/link"
import {
  AudioLines,
  Download,
  File,
  FileText,
  Image as ImageIcon,
  Package,
  Video,
  type LucideIcon,
} from "lucide-react"

import { fileTypeLabel } from "@/lib/file-type"
import { getBuyerDownloads } from "@/lib/server/dal/downloads"
import { requireUser } from "@/lib/server/request/session"
import { formatFileSize } from "@/lib/utils"
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

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

// Keyed by the labels fileTypeLabel produces. A creator sells whatever they
// like, so this cannot be exhaustive — anything unlisted falls back to a
// generic icon rather than rendering undefined.
const TYPE_ICONS: Record<string, LucideIcon> = {
  ZIP: Package,
  RAR: Package,
  "7Z": Package,
  TAR: Package,
  GZ: Package,
  PDF: FileText,
  DOC: FileText,
  DOCX: FileText,
  TXT: FileText,
  EPUB: FileText,
  MP3: AudioLines,
  WAV: AudioLines,
  FLAC: AudioLines,
  AIFF: AudioLines,
  MP4: Video,
  MOV: Video,
  WEBM: Video,
  PNG: ImageIcon,
  JPG: ImageIcon,
  JPEG: ImageIcon,
  SVG: ImageIcon,
  PSD: ImageIcon,
}

export default async function DownloadsPage() {
  const user = await requireUser()
  const downloads = await getBuyerDownloads(user.id)

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
          {downloads.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-8 text-center text-muted-foreground"
              >
                No downloads yet.{" "}
                <Link href="/explore" className="text-foreground underline">
                  Find something to buy
                </Link>
                .
              </TableCell>
            </TableRow>
          ) : (
            downloads.map((item) => {
              const type = fileTypeLabel(item.fileName)
              const Icon = TYPE_ICONS[type] ?? File
              return (
                <TableRow key={item.purchaseId}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Icon className="size-4" />
                      </span>
                      {/* The purchase's snapshotted name, not the product's
                          current one: this is what they bought. */}
                      <span className="max-w-[420px] truncate">
                        {item.productName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{type}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatFileSize(item.fileSizeBytes)}
                  </TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">
                    {DATE_FORMAT.format(item.purchasedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      {/* A plain <a>, not next/link: the href is a route
                          handler, and Link would try to client-navigate to it
                          and rsc-fetch a response that is not a page. */}
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<a href={`/downloads/${item.productId}`} />}
                      >
                        <Download /> Download
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </TableCard>
    </div>
  )
}
