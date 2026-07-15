import { CenteredCardShell } from "@/components/layouts/centered-card-shell"

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <CenteredCardShell>{children}</CenteredCardShell>
}
