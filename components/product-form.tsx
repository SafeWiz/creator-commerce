import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import type { MockProduct } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function ProductForm({ product }: { product?: MockProduct }) {
  const isNew = !product
  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-5 p-6">
      <div>
        <Link
          href="/products"
          className="mb-2.5 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-[15px]" /> Products
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-medium tracking-[-0.02em]">
            {isNew ? "New product" : product.name}
          </h1>
          {!isNew && (
            <Badge variant={product.status === "Published" ? "default" : "secondary"}>
              {product.status === "Draft" && (
                <span className="size-1.5 rounded-full bg-muted-foreground" />
              )}
              {product.status}
            </Badge>
          )}
          <div className="flex-1" />
          <Button variant="ghost">Discard</Button>
          <Button variant="outline">Save draft</Button>
          <Button>Publish</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Product name</Label>
            <Input
              id="name"
              defaultValue={product?.name}
              placeholder="e.g. Lightroom Preset Pack"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="price">Price (USD)</Label>
            <Input
              id="price"
              defaultValue={product?.price.replace("$", "")}
              placeholder="29.00"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Describe what buyers get…" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
