// Static placeholder data for the screens whose backend doesn't exist yet.
// Products, storefronts, purchases, sales and downloads now read from the
// database; what's left here backs the dashboard.
//
// The dashboard's KPIs could be derived from `purchases` except for Conversion,
// which has no data source anywhere.
//
// Each block goes away with the session that lands its feature.

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
