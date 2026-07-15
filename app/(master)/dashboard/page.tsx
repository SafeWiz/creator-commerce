import type { Metadata } from "next"
import Link from "next/link"
import { Check } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Dashboard",
}

const KPIS = [
  { label: "Revenue", value: "$4,280", sub: "last 30 days", delta: "+12%", up: true },
  { label: "Units sold", value: "142", sub: "last 30 days", delta: "+8%", up: true },
  { label: "Products", value: "14", sub: "3 drafts", delta: null, up: true },
  { label: "Conversion", value: "3.1%", sub: "storefront", delta: "-0.4%", up: false },
]

const TOP_PRODUCTS = [
  { name: "Golden Hour Presets", rev: "$2,436", pct: 57 },
  { name: "Notion Freelance OS", rev: "$779", pct: 18 },
  { name: "Ambient Loops Vol. 2", rev: "$204", pct: 5 },
]

const CHECKLIST = [
  { done: true, label: "Create your account" },
  { done: true, label: "Claim your handle", sub: "creatorcommerce.com/@gabi" },
  { done: true, label: "Publish your first product" },
  { done: false, label: "Connect Stripe to get paid" },
  { done: false, label: "Share your storefront link" },
]

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-5 p-6">
      <div>
        <h1 className="font-heading text-2xl font-medium tracking-[-0.02em]">
          Welcome back, Gabi
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s how your storefront is doing.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {KPIS.map((kpi) => (
          <Card key={kpi.label} size="sm">
            <CardHeader>
              <CardDescription>{kpi.label}</CardDescription>
              {kpi.delta && (
                <CardAction>
                  <Badge variant={kpi.up ? "default" : "destructive"}>{kpi.delta}</Badge>
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              <div className="font-mono text-3xl leading-none font-medium tracking-[-0.02em]">
                {kpi.value}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{kpi.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] items-start gap-4">
        {/* Top products */}
        <Card>
          <CardHeader>
            <CardTitle>Top products</CardTitle>
            <CardDescription>By revenue, last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3.5">
            {TOP_PRODUCTS.map((product) => (
              <div key={product.name} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[13px]">
                  <span className="font-medium">{product.name}</span>
                  <span className="font-mono text-muted-foreground">{product.rev}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${product.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/sales" />}>
              View all sales
            </Button>
          </CardFooter>
        </Card>

        {/* Onboarding checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Get your first sale</CardTitle>
            <CardDescription>3 of 5 complete</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col">
            {CHECKLIST.map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-2.5 border-b py-2 last:border-b-0"
              >
                {item.done ? (
                  <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                ) : (
                  <span className="mt-0.5 size-[18px] shrink-0 rounded-full border-[1.5px]" />
                )}
                <div className="flex flex-col gap-0.5">
                  <span
                    className={
                      item.done
                        ? "text-[13px] text-muted-foreground line-through"
                        : "text-[13px] font-medium"
                    }
                  >
                    {item.label}
                  </span>
                  {item.sub && (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {item.sub}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button size="sm">Connect Stripe</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
