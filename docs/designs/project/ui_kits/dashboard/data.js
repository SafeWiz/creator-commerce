// Mock data for the Creator Commerce dashboard UI kit.
window.CC_DATA = {
  user: { name: "Gabi Ionescu", handle: "@gabi", email: "gabi@example.com", initials: "GI" },
  kpis: [
    { label: "Revenue", value: "$4,280", sub: "last 30 days", delta: "+12%", up: true },
    { label: "Units sold", value: "142", sub: "last 30 days", delta: "+8%", up: true },
    { label: "Products", value: "14", sub: "3 drafts", delta: null, up: true },
    { label: "Conversion", value: "3.1%", sub: "storefront", delta: "-0.4%", up: false },
  ],
  checklist: [
    { done: true, label: "Create your account" },
    { done: true, label: "Claim your handle", sub: "creatorcommerce.com/@gabi" },
    { done: true, label: "Publish your first product" },
    { done: false, label: "Connect Stripe to get paid" },
    { done: false, label: "Share your storefront link" },
  ],
  products: [
    { id: "p1", name: "Lightroom Preset Pack — Golden Hour", type: "ZIP", price: "$29.00", status: "Published", sold: 84, updated: "2h ago" },
    { id: "p2", name: "Notion Freelance OS", type: "PDF", price: "$19.00", status: "Published", sold: 41, updated: "1d ago" },
    { id: "p3", name: "Ambient Loops Vol. 2", type: "Audio", price: "$12.00", status: "Published", sold: 17, updated: "3d ago" },
    { id: "p4", name: "Brand Guidelines Template", type: "PDF", price: "$24.00", status: "Draft", sold: 0, updated: "5d ago" },
    { id: "p5", name: "Icon Set — Outline 240", type: "ZIP", price: "$15.00", status: "Draft", sold: 0, updated: "1w ago" },
  ],
  topProducts: [
    { name: "Golden Hour Presets", rev: "$2,436", pct: 57 },
    { name: "Notion Freelance OS", rev: "$779", pct: 18 },
    { name: "Ambient Loops Vol. 2", rev: "$204", pct: 5 },
  ],
  // storefront
  storeProducts: [
    { id: "p1", name: "Golden Hour Presets", type: "ZIP", price: "$29", blurb: "20 warm, filmic Lightroom presets for portraits & travel." },
    { id: "p2", name: "Notion Freelance OS", type: "PDF", price: "$19", blurb: "The all-in-one Notion system to run your freelance business." },
    { id: "p3", name: "Ambient Loops Vol. 2", type: "Audio", price: "$12", blurb: "24 royalty-free ambient loops for focus and film." },
    { id: "p6", name: "Portrait LUT Bundle", type: "ZIP", price: "$34", blurb: "Cinematic color LUTs for video — DaVinci & Premiere." },
    { id: "p7", name: "Client Contract Kit", type: "PDF", price: "$22", blurb: "Lawyer-reviewed contract templates for creatives." },
    { id: "p8", name: "Procreate Brush Set", type: "ZIP", price: "$16", blurb: "48 textured brushes for illustration and lettering." },
  ],
};
