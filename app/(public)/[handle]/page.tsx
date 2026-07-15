import type { Metadata } from "next"
import Link from "next/link"
import { AudioLines, FileText, Package, type LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"

export const metadata: Metadata = {
  title: "Gabi Ionescu (@gabi)",
  description:
    "Digital products for photographers and creatives. Instant download after checkout.",
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  ZIP: Package,
  PDF: FileText,
  Audio: AudioLines,
}

const COVERS = ["#e7e6df", "#dfe4dc", "#e5e2da", "#dde2e0", "#e6e3dd", "#dce3de"]

const PRODUCTS = [
  {
    slug: "golden-hour-presets",
    name: "Golden Hour Presets",
    type: "ZIP",
    price: "$29",
    blurb: "20 warm, filmic Lightroom presets for portraits & travel.",
  },
  {
    slug: "notion-freelance-os",
    name: "Notion Freelance OS",
    type: "PDF",
    price: "$19",
    blurb: "The all-in-one Notion system to run your freelance business.",
  },
  {
    slug: "ambient-loops-vol-2",
    name: "Ambient Loops Vol. 2",
    type: "Audio",
    price: "$12",
    blurb: "24 royalty-free ambient loops for focus and film.",
  },
  {
    slug: "portrait-lut-bundle",
    name: "Portrait LUT Bundle",
    type: "ZIP",
    price: "$34",
    blurb: "Cinematic color LUTs for video — DaVinci & Premiere.",
  },
  {
    slug: "client-contract-kit",
    name: "Client Contract Kit",
    type: "PDF",
    price: "$22",
    blurb: "Lawyer-reviewed contract templates for creatives.",
  },
  {
    slug: "procreate-brush-set",
    name: "Procreate Brush Set",
    type: "ZIP",
    price: "$16",
    blurb: "48 textured brushes for illustration and lettering.",
  },
]

export default function StorefrontPage() {
  return (
    <div className="mx-auto max-w-[1080px] px-6 pt-8 pb-16">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-medium tracking-[-0.02em]">
          Presets, templates &amp; sounds by Gabi
        </h1>
        <p className="mt-1.5 max-w-[60ch] text-[15px] text-muted-foreground">
          Digital products for photographers and creatives. Instant download
          after checkout.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-5">
        {PRODUCTS.map((product, i) => {
          const Icon = TYPE_ICONS[product.type]
          const cover = COVERS[i % COVERS.length]
          return (
            <Link
              key={product.slug}
              href={`/@gabi/${product.slug}`}
              className="flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow hover:ring-foreground/15"
            >
              <div
                className="flex aspect-[3/2] items-center justify-center text-muted-foreground"
                style={{
                  background: `linear-gradient(135deg, ${cover}, color-mix(in oklch, ${cover}, black 8%))`,
                }}
              >
                <Icon className="size-[26px]" />
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-heading text-[15px] font-medium">
                    {product.name}
                  </span>
                  <Badge variant="outline">{product.type}</Badge>
                </div>
                <p className="flex-1 text-[13px] leading-normal text-muted-foreground">
                  {product.blurb}
                </p>
                <span className="mt-1 font-mono text-base font-medium">
                  {product.price}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
