import 'server-only'

export type ProductType = "ZIP" | "PDF" | "Audio"

export interface Product {
  id: string
  name: string
  type: ProductType
  price: string
  status: "Published" | "Draft"
  sold: number
  updated: string
}

export function getProductsByUser(userId: string): Promise<Product[]> {
  return Promise.resolve([])
}