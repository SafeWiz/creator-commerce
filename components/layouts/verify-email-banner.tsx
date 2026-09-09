import Link from "next/link"
import { MailWarning } from "lucide-react"

/**
 * The whole enforcement mechanism for email verification.
 *
 * requireEmailVerification is off, so nothing blocks an unverified seller —
 * this is the only thing that asks. Not dismissible on purpose: a dismissal
 * needs somewhere to live, and a nudge you cannot clear is what makes it a
 * nudge rather than a toast. It disappears when emailVerified flips, which is
 * the only way it should.
 */
export function VerifyEmailBanner() {
  return (
    <div className="flex items-center gap-2.5 border-b bg-muted px-4 py-2.5 text-[13px]">
      <MailWarning className="size-4 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">
        Confirm your email address so we can reach you about your sales.
      </span>
      <Link
        href="/verify-email"
        className="font-medium text-primary hover:underline"
      >
        Confirm now
      </Link>
    </div>
  )
}
