import type { Metadata } from "next"

import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { ForgotPasswordForm } from "./forgot-password-form"

export const metadata: Metadata = {
  title: "Reset your password",
}

export default function ForgotPasswordPage() {
  return (
    <>
      <CardHeader>
        <CardTitle className="text-xl">Reset your password</CardTitle>
        <CardDescription>
          We&apos;ll email you a link to choose a new one.
        </CardDescription>
      </CardHeader>
      <ForgotPasswordForm />
    </>
  )
}
