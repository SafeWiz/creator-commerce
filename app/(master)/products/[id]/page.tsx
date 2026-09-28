import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getUserProduct } from "@/lib/server/dal/products"
import { requireUser } from "@/lib/server/request/session"
import { ProductForm } from "@/components/product-form"
import { updateProductAction } from "@/lib/actions/products"

export const metadata: Metadata = {
  title: "Edit product",
}

export default async function EditProductPage({
  params,
}: PageProps<"/products/[id]">) {
  const { id } = await params
  const productId = Number(id)
  if (!Number.isInteger(productId)) {
    notFound()
  }

  const user = await requireUser()
  const product = await getUserProduct(productId, user.id)
  if (!product) {
    notFound()
  }

  return (
    <ProductForm
      action={updateProductAction.bind(null, id)}
      productId={product.id}
      images={product.images}
      // All three columns are written together or not at all, so either the
      // product has a file or it predates them.
      file={
        product.fileKey != null &&
        product.fileName != null &&
        product.fileSizeBytes != null
          ? {
              key: product.fileKey,
              name: product.fileName,
              sizeBytes: product.fileSizeBytes,
            }
          : undefined
      }
      product={{
        name: product.name,
        description: product.description ?? "",
        price: (product.priceInCents / 100).toString(),
        status: product.status,
      }}
    />
  )
}
