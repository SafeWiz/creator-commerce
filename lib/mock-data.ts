// Static placeholder data mirroring docs/designs/project/ui_kits/dashboard/data.js.
// Replaced by live data as backend sessions land.

export const users = [{
  name: "Gabi Ionescu",
  handle: "@gabi",
  email: "gabi@example.com",
  initials: "GI",
}]

export const kpis = [
  { label: "Revenue", value: "$4,280", sub: "last 30 days", delta: "+12%", up: true },
  { label: "Units sold", value: "142", sub: "last 30 days", delta: "+8%", up: true },
  { label: "Products", value: "14", sub: "3 drafts", delta: null, up: true },
  { label: "Conversion", value: "3.1%", sub: "storefront", delta: "-0.4%", up: false },
]

export const checklist = [
  { done: true, label: "Create your account" },
  { done: true, label: "Claim your handle", sub: "creatorcommerce.com/@gabi" },
  { done: true, label: "Publish your first product" },
  { done: false, label: "Connect Stripe to get paid" },
  { done: false, label: "Share your storefront link" },
]

export const topProducts = [
  { name: "Golden Hour Presets", rev: "$2,436", pct: 57 },
  { name: "Notion Freelance OS", rev: "$779", pct: 18 },
  { name: "Ambient Loops Vol. 2", rev: "$204", pct: 5 },
]

export type ProductType = "ZIP" | "PDF" | "Audio"

export type MockProduct = {
  id: string
  name: string
  type: ProductType
  price: string
  status: "Published" | "Draft"
  sold: number
  updated: string
}

export const products: MockProduct[] = [
  { id: "p1", name: "Lightroom Preset Pack — Golden Hour", type: "ZIP", price: "$29.00", status: "Published", sold: 84, updated: "2h ago" },
  { id: "p2", name: "Notion Freelance OS", type: "PDF", price: "$19.00", status: "Published", sold: 41, updated: "1d ago" },
  { id: "p3", name: "Ambient Loops Vol. 2", type: "Audio", price: "$12.00", status: "Published", sold: 17, updated: "3d ago" },
  { id: "p4", name: "Brand Guidelines Template", type: "PDF", price: "$24.00", status: "Draft", sold: 0, updated: "5d ago" },
  { id: "p5", name: "Icon Set — Outline 240", type: "ZIP", price: "$15.00", status: "Draft", sold: 0, updated: "1w ago" },
]

export type StoreProduct = {
  id: string
  // Seller handle, including the leading "@" to match the [handle] segment.
  handle: string
  slug: string
  name: string
  type: ProductType
  price: string
  blurb: string
  cover: string
}

export const storeProducts: StoreProduct[] = [
  { id: "1", handle: "@gabi", slug: "golden-hour-presets", name: "Golden Hour Presets", type: "ZIP", price: "$29", blurb: "20 warm, filmic Lightroom presets for portraits & travel.", cover: "#e7e6df" },
  { id: "2", handle: "@gabi", slug: "notion-freelance-os", name: "Notion Freelance OS", type: "PDF", price: "$19", blurb: "The all-in-one Notion system to run your freelance business.", cover: "#dfe4dc" },
  { id: "3", handle: "@gabi", slug: "ambient-loops-vol-2", name: "Ambient Loops Vol. 2", type: "Audio", price: "$12", blurb: "24 royalty-free ambient loops for focus and film.", cover: "#e5e2da" },
  { id: "4", handle: "@gabi", slug: "portrait-lut-bundle", name: "Portrait LUT Bundle", type: "ZIP", price: "$34", blurb: "Cinematic color LUTs for video — DaVinci & Premiere.", cover: "#dde2e0" },
  { id: "5", handle: "@gabi", slug: "client-contract-kit", name: "Client Contract Kit", type: "PDF", price: "$22", blurb: "Lawyer-reviewed contract templates for creatives.", cover: "#e6e3dd" },
  { id: "6", handle: "@gabi", slug: "procreate-brush-set", name: "Procreate Brush Set", type: "ZIP", price: "$16", blurb: "48 textured brushes for illustration and lettering.", cover: "#dce3de" },
]

export const sales = [
  { order: "ord_8fA2c1", product: "Golden Hour Presets", buyer: "mara@example.com", date: "Jul 14, 2026", amount: "$29.00" },
  { order: "ord_7dK9b4", product: "Notion Freelance OS", buyer: "alex@example.com", date: "Jul 14, 2026", amount: "$19.00" },
  { order: "ord_6cJ3e8", product: "Golden Hour Presets", buyer: "iris@example.com", date: "Jul 13, 2026", amount: "$29.00" },
  { order: "ord_5bH1f2", product: "Ambient Loops Vol. 2", buyer: "tom@example.com", date: "Jul 12, 2026", amount: "$12.00" },
  { order: "ord_4aG7d5", product: "Golden Hour Presets", buyer: "nina@example.com", date: "Jul 11, 2026", amount: "$29.00" },
  { order: "ord_3zF4c9", product: "Notion Freelance OS", buyer: "leo@example.com", date: "Jul 10, 2026", amount: "$19.00" },
]

export const purchases = [
  { product: "Cinematic SFX Library", creator: "@soundroom", date: "Jun 28, 2026", amount: "$24.00" },
  { product: "Figma Portfolio Kit", creator: "@designdaily", date: "Jun 12, 2026", amount: "$18.00" },
  { product: "Street Photography Guide", creator: "@frankshoots", date: "May 30, 2026", amount: "$15.00" },
]

export const downloads = [
  { product: "Cinematic SFX Library", type: "ZIP" as ProductType, size: "312 MB", purchased: "Jun 28, 2026" },
  { product: "Figma Portfolio Kit", type: "ZIP" as ProductType, size: "9 MB", purchased: "Jun 12, 2026" },
  { product: "Street Photography Guide", type: "PDF" as ProductType, size: "14 MB", purchased: "May 30, 2026" },
]
