'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createProduct } from '@/lib/server/dal/products'
import type { ProductStatus } from '@/lib/server/db/schemas/product'

export async function createProductAction(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const price = Number(formData.get('price'))
  const status: ProductStatus =
    formData.get('status') === 'published' ? 'published' : 'draft'

  const product = await createProduct({
    name,
    description: description || null,
    priceInCents: Math.round(price * 100),
    status,
  })

  revalidatePath('/products')
  redirect(`/products/${product.id}`)
}
