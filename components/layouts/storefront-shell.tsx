import Link from "next/link"
import { Heart } from "lucide-react"

import { Button } from "@/components/ui/button"

export function StorefrontShell({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="mx-auto flex max-w-[1080px] items-center gap-3.5 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-chart-1 font-heading text-base font-bold">
              GI
            </span>
            <div className="flex flex-col">
              <span className="font-heading text-base leading-tight font-medium tracking-[-0.01em]">
                Gabi Ionescu
              </span>
              <span className="font-mono text-xs text-muted-foreground">@gabi</span>
            </div>
          </div>
          <div className="flex-1" />
          <Button variant="outline" size="sm">
            <Heart /> Wishlist
          </Button>
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login" />}>
            Sign in
          </Button>
        </div>
      </header>
      {children}
    </>
  )
}
