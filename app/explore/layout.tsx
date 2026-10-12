import { getUser } from "@/lib/server/request/session"
import { DashboardShell } from "@/components/layouts/dashboard-shell"
import { ExploreShell } from "@/components/layouts/explore-shell"

// Outside (master) on purpose: that group is signed-in only and noindex, and
// /explore is neither. A signed-in viewer still gets the dashboard shell, so the
// page keeps its place in the sidebar; a signed-out one gets a public header.
export default async function ExploreLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getUser()
  return user ? (
    <DashboardShell>{children}</DashboardShell>
  ) : (
    <ExploreShell>{children}</ExploreShell>
  )
}
