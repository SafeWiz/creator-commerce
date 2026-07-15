import Link from "next/link"
import {
  CircleHelp,
  Download,
  ExternalLink,
  Heart,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"

import { Logo, Wordmark } from "@/components/logo"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

type NavItem = { label: string; href: string; icon: LucideIcon }

const NAV_GROUPS: { label?: string; items: NavItem[] }[] = [
  {
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Selling",
    items: [
      { label: "Products", href: "/products", icon: Package },
      { label: "Sales", href: "/sales", icon: TrendingUp },
    ],
  },
  {
    label: "Buying",
    items: [
      { label: "Purchases", href: "/purchases", icon: Receipt },
      { label: "Downloads", href: "/downloads", icon: Download },
      { label: "Wishlist", href: "/wishlist", icon: Heart },
    ],
  },
]

const FOOTER_NAV: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help", href: "/help/first-sale", icon: CircleHelp },
]

function NavMenu({ items }: { items: NavItem[] }) {
  return (
    <SidebarMenu>
      {items.map(({ label, href, icon: Icon }) => (
        <SidebarMenuItem key={href}>
          <SidebarMenuButton
            tooltip={label}
            isActive={href === "/dashboard"}
            render={<Link href={href} />}
          >
            <Icon />
            <span>{label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}

export function DashboardShell({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
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
          {NAV_GROUPS.map((group, i) => (
            <SidebarGroup key={group.label ?? i}>
              {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <NavMenu items={group.items} />
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <NavMenu items={FOOTER_NAV} />
          <div className="flex items-center gap-2 p-1">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-chart-1 text-[11px] font-bold">
              GI
            </span>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-[13px] leading-tight font-medium">Gabi Ionescu</span>
              <span className="font-mono text-[11px] text-muted-foreground">@gabi</span>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
          <SidebarTrigger />
          <span className="font-heading text-[15px] font-medium tracking-[-0.01em]">
            Dashboard
          </span>
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
