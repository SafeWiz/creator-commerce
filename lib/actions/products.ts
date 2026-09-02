'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import {
  createProduct,
  deleteUserProduct,
  discardStagedImages,
  setProductImages,
  updateUserProduct,
} from '@/lib/server/dal/products'
import { revalidateStorefront } from '@/lib/server/revalidate'
import {
  deleteUploadedFileKeys,
  deleteUploadedFiles,
} from '@/lib/server/uploadthing'
import { requireUser } from '@/lib/server/session'
import {
  MAX_PRODUCT_IMAGES,
  createProductWithFileSchema,
  saveProductSchema,
} from '@/lib/schemas/product'

export type ProductFormState = {
  fieldErrors?: Record<string, string[]>
  formError?: string
}

export async function createProductAction(
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const user = await requireUser()

  const parsed = createProductWithFileSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    // Required, not defaulted. The form always sends the field — "[]" when
    // there are none — so an absent one is a broken client, and saying so beats
    // reading it as "no images".
    images: formData.get('images'),
  })

  if (!parsed.success) {
    const { fieldErrors, formErrors } = z.flattenError(parsed.error)
    return { fieldErrors, formError: formErrors[0] }
  }

  const { name, description, price, status, fileKey, images } = parsed.data

  const product = await createProduct({
    ownerId: user.id,
    name,
    description: description || null,
    priceInCents: Math.round(price * 100),
    status,
    fileKey,
  })

  // The key named no upload of this user's. In practice that is a form left open
  // across a sign-out, or one submitted with a key the browser invented — either
  // way the fix is the same, so it is reported on the field that carries it.
  if (!product) {
    return {
      fieldErrors: {
        fileKey: ['That upload could not be found. Please choose the file again.'],
      },
    }
  }

  // A second statement rather than part of the insert. The product exists
  // either way, and images that fail to attach are a smaller problem than a
  // product that fails to exist — the user can add them again; a lost product
  // cannot be recovered from a submitted form.
  const committed =
    images.length > 0 ? await setProductImages(product.id, user.id, images) : null

  revalidatePath('/products')
  revalidateStorefront()

  // The list was not one this user could have built, so none of it attached.
  // The product page is the only place that gap is visible and fixable; the
  // list would look perfectly fine.
  if (images.length > 0 && !committed) {
    redirect(`/products/${product.id}`)
  }

  redirect(`/products`)
}

export async function updateProductAction(
  id: string,
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const user = await requireUser()

  const productId = Number(id)
  if (!Number.isInteger(productId)) {
    return { formError: 'Product not found' }
  }

  const parsed = saveProductSchema.safeParse({
    name: formData.get('name'),
    // Absent field reads as null; the schema's optional string wants undefined.
    description: formData.get('description') ?? undefined,
    price: formData.get('price'),
    status: formData.get('status'),
    // Required, not defaulted: an absent field is a broken client, and on the
    // update path an empty list means "remove every image" — the two must not
    // look the same.
    images: formData.get('images'),
  })

  if (!parsed.success) {
    const { fieldErrors, formErrors } = z.flattenError(parsed.error)
    return { fieldErrors, formError: formErrors[0] }
  }

  const { name, description, price, status, images } = parsed.data

  // Images first, so a list this user could not have built stops the whole save
  // before anything is written. Reversed, a rejected list would leave the other
  // fields updated and the user told the save failed.
  const committed = await setProductImages(productId, user.id, images)
  if (!committed) {
    return { formError: 'Those images could not be saved' }
  }

  // Detached above, deleted here: the row no longer points at these urls, so a
  // failed storage delete costs storage rather than a broken page. Runs
  // regardless of whether the field update below matches a row — the images
  // are already detached and have no staging row, so this is the only chance
  // to reach them.
  await deleteUploadedFiles(committed.removed)

  const product = await updateUserProduct({
    id: productId,
    ownerId: user.id,
    name,
    description: description || null,
    priceInCents: Math.round(price * 100),
    status,
  })

  if (!product) {
    // The images above did commit, so this is not a no-op failure: the product
    // was deleted between the two statements. Revalidate before reporting, or
    // the caches keep serving the images the row no longer has.
    revalidatePath('/products')
    revalidatePath(`/products/${productId}`)
    revalidateStorefront()
    return { formError: 'Product not found' }
  }

  revalidatePath('/products')
  revalidatePath(`/products/${productId}`)
  revalidateStorefront()
  redirect('/products')
}

/**
 * Throws away uploads the user backed out of — the X on an image that was never
 * saved, and everything staged when Discard is pressed.
 *
 * Only staging rows can match, so this cannot detach an image from a product;
 * committed images leave through setProductImages when the form is saved.
 *
 * Returns nothing. The image is already gone from the form's state, and a
 * failure here leaves an orphan the sweep collects rather than anything the user
 * could act on.
 */
export async function discardStagedImagesAction(urls: string[]): Promise<void> {
  const user = await requireUser()

  // Same shape the save path validates, for the same reason: the urls come from
  // the browser. Anything else is not a list this form could have produced, and
  // there is nothing to report back to a caller that sent one.
  const parsed = z.array(z.url()).max(MAX_PRODUCT_IMAGES).safeParse(urls)
  if (!parsed.success) return

  const keys = await discardStagedImages(user.id, parsed.data)
  await deleteUploadedFileKeys(keys)
}

export async function deleteProductAction(id: string): Promise<void> {
  const user = await requireUser()

  const productId = Number(id)
  if (Number.isInteger(productId)) {
    const deleted = await deleteUserProduct(productId, user.id)
    // Detached first, deleted second: the row no longer points at these urls, so
    // a failed storage delete costs storage rather than a broken page.
    if (deleted) await deleteUploadedFiles(deleted.images)
    revalidatePath('/products')
    revalidateStorefront()
  }

  redirect('/products')
}
