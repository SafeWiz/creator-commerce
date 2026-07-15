import Link from "next/link"
import { ExternalLink } from "lucide-react"

import { users } from "@/lib/mock-data"
import { Logo, Wordmark } from "@/components/logo"
import {
  DashboardFooterNav,
  DashboardNavGroups,
} from "@/components/layouts/dashboard-nav"
import { DashboardTopbarTitle } from "@/components/layouts/dashboard-topbar-title"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export function DashboardShell({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = users[0]
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link href="/dashboard" className="flex h-10 items-center gap-2 px-1">
            <Logo size={26} />
            <Wordmark className="text-[15px] group-data-[collapsible=icon]:hidden" />
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <DashboardNavGroups />
        </SidebarContent>
        <SidebarFooter>
          <DashboardFooterNav />
          <div className="flex items-center gap-2 p-1">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-chart-1 text-[11px] font-bold">
              {user.initials}
            </span>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-[13px] leading-tight font-medium">{user.name}</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {user.handle}
              </span>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
          <SidebarTrigger />
          <DashboardTopbarTitle />
          <div className="flex-1" />
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/@gabi" />}>
            <ExternalLink /> View storefront
          </Button>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
