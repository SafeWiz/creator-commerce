import type { Metadata } from "next"

import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { SignupForm } from "./signup-form"

export const metadata: Metadata = {
  title: "Sign up",
}

export default function SignupPage() {
  return (
    <>
      <CardHeader>
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>Claim your handle and start selling.</CardDescription>
      </CardHeader>
      <SignupForm />
    </>
  )
}
