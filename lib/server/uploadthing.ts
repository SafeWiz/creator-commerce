import 'server-only'

import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { UTApi, UploadThingError } from 'uploadthing/server'

import {
  MAX_PRODUCT_FILE_BYTES,
  MAX_PRODUCT_FILE_LABEL,
} from '@/lib/schemas/product'
import { recordProductImageUpload, recordProductUpload } from '@/lib/server/dal/products'
import { getUser } from '@/lib/server/session'

const f = createUploadthing()

export const uploadRouter = {
  /**
   * A product image, uploaded before it is attached to anything.
   *
   * It takes no productId and does not touch `products`. Images are form state
   * until the user saves — that is what makes Discard mean something and what
   * lets a product being created carry images at all — so all this does is
   * record that the bytes landed, and whose they are.
   *
   * Nothing is revalidated here for the same reason: no page shows anything
   * different until the form is saved.
   *
   * maxFileCount caps one batch. The product-wide MAX_PRODUCT_IMAGES is enforced
   * by the form on select and by setProductImages on commit, which are the two
   * places that can still count.
   */
  productImage: f({ image: { maxFileSize: '4MB', maxFileCount: 4 } })
    .middleware(async () => {
      // getUser(), not requireUser(): a redirect is the wrong response shape
      // for an upload endpoint.
      const user = await getUser()
      if (!user) throw new UploadThingError('Unauthorized')

      return { ownerId: user.id }
    })
    // Fires once per file, from UploadThing's servers.
    .onUploadComplete(async ({ metadata, file }) => {
      // ufsUrl, not url/appUrl — those are deprecated and go away in v9.
      await recordProductImageUpload({
        ownerId: metadata.ownerId,
        key: file.key,
        url: file.ufsUrl,
      })

      return { url: file.ufsUrl }
    }),

  /**
   * The digital product itself — one file, uploaded before the product exists.
   *
   * Deliberately unlike productImage in two ways. It takes no productId, because
   * there is no product yet: the file is picked on the create form, and the
   * completion callback records it against the uploader alone. And it accepts
   * `blob` rather than a media type, because what a creator sells is their
   * business — a zip, a pdf, a psd, a video.
   *
   * `128MB` is not the limit. It is the smallest power of two above the limit,
   * which is all UploadThing's config can express; MAX_PRODUCT_FILE_BYTES is the
   * real ceiling and the checks below are what enforce it.
   */
  productFile: f({
    blob: {
      maxFileSize: '128MB',
      maxFileCount: 1,
      // Paid content, so it must not be fetchable by url alone. Downloads go
      // through /downloads/[productId], which checks entitlement and mints a
      // short-lived signed url per click.
      //
      // Needs ACL overrides enabled for the app; without them this throws at
      // presign. That is the right failure — quietly falling back to
      // public-read is the one outcome we cannot have.
      acl: 'private',
      // Defaults to 'inline', which renders a pdf or a txt in a tab rather than
      // downloading it. A cross-origin `<a download>` is ignored by browsers,
      // so this header is the only thing that makes the click a download.
      contentDisposition: 'attachment',
    },
  })
    .middleware(async ({ files }) => {
      // getUser(), not requireUser(): a redirect is the wrong response shape
      // for an upload endpoint.
      const user = await getUser()
      if (!user) throw new UploadThingError('Unauthorized')

      // maxFileCount caps the batch, but a product has exactly one file and the
      // callback below assumes it, so anything else is rejected outright rather
      // than silently taking the first.
      const [file] = files
      if (files.length !== 1 || !file) {
        throw new UploadThingError('Choose a single file')
      }

      // The size the browser claims. Trusting it here is the point: a claim over
      // the limit is a rejection before a single byte is uploaded, and a claim
      // under it buys nothing, because the callback re-checks the real one.
      if (file.size > MAX_PRODUCT_FILE_BYTES) {
        throw new UploadThingError(
          `File must be at most ${MAX_PRODUCT_FILE_LABEL}`,
        )
      }

      return { ownerId: user.id }
    })
    // Fires from UploadThing's servers, with the file's measured size.
    .onUploadComplete(async ({ metadata, file }) => {
      // The authoritative size check. A client that under-reported to get past
      // the middleware lands here, and nothing is recorded — so the key can
      // never be claimed by a product, and the bytes go straight back out.
      if (file.size > MAX_PRODUCT_FILE_BYTES) {
        await deleteUploadedFileKeys([file.key])
        throw new UploadThingError(
          `File must be at most ${MAX_PRODUCT_FILE_LABEL}`,
        )
      }

      await recordProductUpload({
        ownerId: metadata.ownerId,
        key: file.key,
        name: file.name,
        sizeBytes: file.size,
      })

      // The key is all the form needs: it submits that, and the create action
      // reads the name and size back from the row this just wrote.
      return { key: file.key }
    }),
} satisfies FileRouter

export type UploadRouter = typeof uploadRouter

// Reads UPLOADTHING_TOKEN from the environment, same as the route handler.
const utapi = new UTApi()

// A ufsUrl is https://<appId>.ufs.sh/f/<key>, so the key is the last segment.
function fileKeyFromUrl(url: string) {
  try {
    return new URL(url).pathname.split('/').pop() || null
  } catch {
    return null
  }
}

/**
 * Deletes the underlying files from UploadThing storage.
 *
 * Callers must have already detached the urls from the row that referenced
 * them: the database is the source of truth, and a product pointing at a
 * deleted file renders a broken image, whereas a file with nothing pointing at
 * it is merely wasted storage. A failure here is swallowed for the same reason
 * — the user's delete already succeeded as far as the product is concerned.
 */
export async function deleteUploadedFiles(urls: string[]) {
  await deleteUploadedFileKeys(
    urls.map(fileKeyFromUrl).filter((key) => key !== null),
  )
}

/**
 * Same contract as deleteUploadedFiles, for callers holding a key rather than a
 * url.
 *
 * The only such caller is the product-file route rejecting an upload that came
 * in over the size limit. That file is not a product file and never becomes one
 * — no row records it — so this is not a way to detach a file from a product.
 * There is none: a product's file lives and dies with the product.
 */
export async function deleteUploadedFileKeys(keys: string[]) {
  if (keys.length === 0) return

  try {
    await utapi.deleteFiles(keys)
  } catch (error) {
    console.error('Failed to delete files from UploadThing storage', error)
  }
}

/**
 * A short-lived url for a private product file.
 *
 * `generateSignedURL`, not `getSignedURL`: it signs locally with the app secret
 * instead of calling UploadThing, and the fetching variant is deprecated in v8
 * and removed in v9.
 *
 * Five minutes rather than seconds. The url never reaches the page — the
 * download route redirects to it and nothing else ever holds it — so its
 * lifetime is only exposed to whoever already had it, and a 100MB transfer that
 * drops and is retried by the browser should succeed rather than 403.
 *
 * This signs whatever key it is handed. Checking that the caller is allowed to
 * have it happens in the DAL, before this is reached.
 */
export async function signProductFileUrl(key: string) {
  const { ufsUrl } = await utapi.generateSignedURL(key, { expiresIn: '5m' })
  return ufsUrl
}
