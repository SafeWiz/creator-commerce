import Link from "next/link"

import { Logo, Wordmark } from "@/components/logo"
import { Card } from "@/components/ui/card"

export function CenteredCardShell({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-[22px] bg-muted p-6">
      <Link href="/" className="flex items-center gap-2.5">
        <Logo size={32} />
        <Wordmark className="text-lg" />
      </Link>
      <Card className="w-full max-w-[400px] [--card-spacing:--spacing(7)]">
        {children}
      </Card>
    </div>
  )
}
