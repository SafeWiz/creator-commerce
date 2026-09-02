"use client"

import { X } from "lucide-react"

import { Image } from "@/components/image"
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
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2.5">
            {images.map((url) => (
              <div
                key={url}
                className="group/image relative size-24 overflow-hidden rounded-lg border border-border bg-muted"
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover"
                />
                {/* Revealed on hover, but always reachable by keyboard. */}
                <Button
                  type="button"
                  size="icon-xs"
                  variant="destructive"
                  aria-label="Remove image"
                  onClick={() => onRemove(url)}
                  className="absolute top-1 right-1 bg-background/80 opacity-0 backdrop-blur-sm transition-opacity group-hover/image:opacity-100 focus-visible:opacity-100"
                >
                  <X />
                </Button>
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
              onError(null)
              onUploaded(res.map((file) => file.serverData.url))
            }}
            onUploadError={(e) => onError(e.message)}
            // Runs before any bytes leave the browser. maxFileCount bounds one
            // batch and the card hides at the cap, but neither stops a batch
            // that *crosses* it — and a file uploaded past the limit would be
            // dropped from the list with nowhere left to reach it from.
            onBeforeUploadBegin={(files) => {
              const remaining = MAX_PRODUCT_IMAGES - images.length
              if (files.length <= remaining) {
                onError(null)
                return files
              }

              onError(
                `Only ${remaining} more image${remaining === 1 ? "" : "s"} allowed`,
              )
              return files.slice(0, remaining)
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
