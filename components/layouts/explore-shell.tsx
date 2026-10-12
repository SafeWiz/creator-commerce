import Link from "next/link"

import { authPathWithNext } from "@/lib/schemas/auth"
import { Logo, Wordmark } from "@/components/logo"
import { CartBadge } from "@/components/cart-badge"
import { Button } from "@/components/ui/button"

/**
 * Header for /explore when no one is signed in. A signed-in viewer gets the
 * DashboardShell instead (app/explore/layout.tsx).
 *
 * Not MarketingShell: its section links point at anchors on the landing page.
 * Sign-in carries the return path, so a visitor who signs in from here comes
 * back to the marketplace rather than landing on the dashboard.
 */
export function ExploreShell({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="mx-auto flex max-w-[1120px] items-center gap-3.5 px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={28} />
            <Wordmark className="text-[17px] max-sm:sr-only" />
          </Link>
          <div className="flex-1" />
          <CartBadge />
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href={authPathWithNext("/login", "/explore")} />}
          >
            Sign in
          </Button>
          <Button size="sm" nativeButton={false} render={<Link href="/signup" />}>
            Start selling
          </Button>
        </div>
      </header>
      <main>{children}</main>
    </>
  )
}
