"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, X } from "lucide-react"

import { Image, THUMBNAIL_QUALITY } from "@/components/image"
import { UploadDropzone } from "@/lib/client/uploadthing"
import { MAX_PRODUCT_IMAGES } from "@/lib/schemas/product"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * The image list, as a controlled field.
 *
 * It makes no server call of its own and knows nothing about products. Whether a
 * removed image needs cleaning up is the form's question — it is the one that
 * knows which urls it uploaded this session — so this only reports the three
 * things that happen here: files arrived, one was dismissed, or something went
 * wrong.
 *
 * What it does own is local previews. A dropped file is shown at once from a
 * `blob:` url of its own bytes, with a spinner over it while it uploads, and
 * that same blob keeps standing in for the uploaded url afterwards — otherwise
 * the tile would sit empty through the upload and then again through a fetch
 * of the image the browser already has. Previews never leave this component:
 * the form, and the save, only ever see UploadThing urls.
 */
export function ProductImages({
  images,
  error,
  onError,
  onUploaded,
  onRemove,
}: {
  // Urls in display order. The first is the cover.
  images: string[]
  // Held by the form: the dropzone and the form both have something to report,
  // and only one message belongs on screen.
  error: string | null
  onError: (message: string | null) => void
  onUploaded: (urls: string[]) => void
  onRemove: (url: string) => void
}) {
  // Files still uploading, in the order they were dropped. Mirrored in a ref
  // because the dropzone's callbacks can outlive the render that created them —
  // a completion reads the list as it is now, not as it was at drop time. Every
  // write goes through setPending so the two never disagree.
  const [pending, setPendingState] = useState<PendingImage[]>([])
  const pendingRef = useRef(pending)

  function setPending(next: PendingImage[]) {
    pendingRef.current = next
    setPendingState(next)
  }

  // Uploaded url → the blob it was previewed from.
  const [previews, setPreviews] = useState<Record<string, string>>({})
  // Every blob url created and not yet revoked, so unmount can free them all.
  // A ref because the cleanup must see the latest set, not the first render's.
  const blobs = useRef(new Set<string>())

  useEffect(() => {
    const created = blobs.current
    return () => {
      for (const blob of created) URL.revokeObjectURL(blob)
      created.clear()
    }
  }, [])

  function revoke(blob: string) {
    URL.revokeObjectURL(blob)
    blobs.current.delete(blob)
  }

  // On error or abort UploadThing does not say which batch failed, and the
  // dropzone does accept a second drop while one is in flight — so every pending
  // preview goes. A batch that does finish afterwards still lands, just without
  // a preview, through its UploadThing url.
  function dropPending() {
    for (const image of pendingRef.current) revoke(image.blob)
    setPending([])
  }

  const atLimit = images.length >= MAX_PRODUCT_IMAGES

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Images</CardTitle>
        <span className="text-sm text-muted-foreground">
          {images.length} of {MAX_PRODUCT_IMAGES}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {images.length + pending.length > 0 && (
          <div className="flex flex-wrap gap-2.5">
            {images.map((url) => (
              <div
                key={url}
                className="group/image relative size-24 overflow-hidden rounded-lg border border-border bg-muted"
              >
                {/* next/image leaves a blob: src unoptimized on its own. */}
                <Image
                  src={previews[url] ?? url}
                  alt=""
                  fill
                  sizes="96px"
                  quality={THUMBNAIL_QUALITY}
                  className="object-cover"
                />
                {/* Revealed on hover, but always reachable by keyboard. */}
                <Button
                  type="button"
                  size="icon-xs"
                  variant="destructive"
                  aria-label="Remove image"
                  onClick={() => {
                    const blob = previews[url]
                    if (blob) {
                      revoke(blob)
                      setPreviews((current) => {
                        const next = { ...current }
                        delete next[url]
                        return next
                      })
                    }
                    onRemove(url)
                  }}
                  className="absolute top-1 right-1 bg-background/80 opacity-0 backdrop-blur-sm transition-opacity group-hover/image:opacity-100 focus-visible:opacity-100"
                >
                  <X />
                </Button>
              </div>
            ))}
            {/* No remove button: there is nothing to remove until the upload
                lands, and the dropzone's own button cancels it. */}
            {pending.map((image) => (
              <div
                key={image.blob}
                className="relative size-24 overflow-hidden rounded-lg border border-border bg-muted"
              >
                <Image
                  src={image.blob}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover opacity-60"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2
                    aria-label="Uploading"
                    className="size-5 animate-spin text-foreground"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Hidden at the cap so the user can't start a batch that would be
            rejected on save. setProductImages is still the authority. */}
        {atLimit ? (
          <p className="text-sm text-muted-foreground">
            Limit of {MAX_PRODUCT_IMAGES} images reached.
          </p>
        ) : (
          <UploadDropzone
            endpoint="productImage"
            // Upload on drop/select instead of making the user click again.
            config={{ mode: "auto" }}
            // The urls are recorded as pending uploads by the endpoint's server
            // callback, which has already run by the time this fires — so the
            // form can submit them the moment it has them.
            onClientUploadComplete={(res) => {
              // Results come back in the order the files went up, but a second
              // batch may have been dropped meanwhile, so each one is matched to
              // its preview by name and size rather than by position. Two files
              // alike in both are interchangeable for a preview anyway.
              const remaining = [...pendingRef.current]
              const matched: Record<string, string> = {}
              for (const file of res) {
                const i = remaining.findIndex(
                  (image) =>
                    image.name === file.name && image.size === file.size,
                )
                if (i === -1) continue
                matched[file.serverData.url] = remaining[i].blob
                remaining.splice(i, 1)
              }
              setPending(remaining)
              setPreviews((current) => ({ ...current, ...matched }))

              onError(null)
              onUploaded(res.map((file) => file.serverData.url))
            }}
            onUploadError={(e) => {
              dropPending()
              onError(e.message)
            }}
            onUploadAborted={dropPending}
            // Runs before any bytes leave the browser. maxFileCount bounds one
            // batch and the card hides at the cap, but neither stops a batch
            // that *crosses* it — and a file uploaded past the limit would be
            // dropped from the list with nowhere left to reach it from.
            onBeforeUploadBegin={(files) => {
              // Pending files count too: a batch still in flight is already
              // spoken for.
              const remaining = Math.max(
                MAX_PRODUCT_IMAGES - images.length - pendingRef.current.length,
                0,
              )
              const accepted = files.slice(0, remaining)
              onError(
                files.length <= remaining
                  ? null
                  : `Only ${remaining} more image${remaining === 1 ? "" : "s"} allowed`,
              )

              const started = accepted.map((file) => {
                const blob = URL.createObjectURL(file)
                blobs.current.add(blob)
                return { blob, name: file.name, size: file.size }
              })
              setPending([...pendingRef.current, ...started])
              return accepted
            }}
            // ut-* variants come from `uploadthing/tw/v4`; these repaint the
            // defaults with our tokens. ut-button mirrors the Button `default`
            // variant so the inner control matches the design system.
            className="mt-0 rounded-lg border-border bg-background p-6 ut-uploading:border-ring/50 ut-label:text-sm ut-label:font-medium ut-label:text-foreground ut-label:hover:text-primary ut-upload-icon:text-muted-foreground ut-allowed-content:text-sm ut-allowed-content:text-muted-foreground ut-button:h-8 ut-button:w-auto ut-button:rounded-lg ut-button:bg-primary ut-button:px-2.5 ut-button:text-sm ut-button:font-medium ut-button:text-primary-foreground ut-button:transition-all ut-button:after:bg-primary/60 ut-button:hover:bg-primary/80 ut-button:focus-within:ring-3 ut-button:focus-within:ring-ring/50"
          />
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}

type PendingImage = {
  // A blob: url of the dropped file itself, revoked when it is no longer shown.
  blob: string
  // What an upload result is matched back to its preview by.
  name: string
  size: number
}
