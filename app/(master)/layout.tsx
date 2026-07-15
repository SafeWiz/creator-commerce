import { DashboardShell } from "@/components/layouts/dashboard-shell"

export default function MasterLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <DashboardShell>{children}</DashboardShell>
}
