import Link from "next/link"
import { ChevronLeft, CloudUpload, FileCheck, ImageIcon, Sparkles } from "lucide-react"

import type { MockProduct } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
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

      <div className="grid grid-cols-[1.5fr_1fr] items-start gap-4">
        <div className="flex flex-col gap-4">
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
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="price">Price (USD)</Label>
                  <Input
                    id="price"
                    defaultValue={product?.price.replace("$", "")}
                    placeholder="29.00"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="slug">Slug</Label>
                  <Input id="slug" placeholder="golden-hour-presets" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Describe what buyers get…" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI product page</CardTitle>
              <CardDescription>
                Generate a description &amp; teaser from the uploaded file.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3.5">
                <Sparkles className="size-[18px] shrink-0 text-primary" />
                <p className="flex-1 text-[13px]">
                  Detected a <b>ZIP</b> asset. Generate a page draft with an
                  image teaser?
                </p>
                <Button size="sm">
                  <Sparkles /> Generate
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Digital asset</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="rounded-lg border-[1.5px] border-dashed p-5 text-center text-muted-foreground">
                <div className="mb-2 flex justify-center">
                  <CloudUpload className="size-[22px]" />
                </div>
                <p className="text-[13px]">
                  Drop a file or <span className="font-medium text-primary">browse</span>
                </p>
                <p className="mt-1 text-[11px]">ZIP, PDF, audio · up to 2 GB</p>
              </div>
              {!isNew && (
                <div className="flex items-center gap-2.5 rounded-lg border px-2.5 py-2">
                  <FileCheck className="size-4 shrink-0" />
                  <span className="flex-1 text-[13px]">golden-hour-v2.zip</span>
                  <span className="font-mono text-[11px] text-muted-foreground">48 MB</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cover image</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex aspect-[16/10] items-center justify-center rounded-lg bg-linear-135 from-border to-chart-1 text-muted-foreground">
                <ImageIcon className="size-6" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
