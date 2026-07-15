import { CenteredCardShell } from "@/components/layouts/centered-card-shell"

export default function CheckoutLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <CenteredCardShell>{children}</CenteredCardShell>
}
