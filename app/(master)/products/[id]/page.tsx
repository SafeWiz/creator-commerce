import type { Metadata } from "next"

import { products } from "@/lib/mock-data"
import { ProductForm } from "@/components/product-form"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Edit product",
}

export default async function EditProductPage({
  params,
}: PageProps<"/products/[id]">) {
  const { id } = await params
  // Static mock: unknown ids fall back to the first product; notFound()
  // wiring comes with real data.
  const product = products.find((p) => p.id === id)
  if (!product) {
    notFound()
  }

  return <ProductForm product={product} />
}
