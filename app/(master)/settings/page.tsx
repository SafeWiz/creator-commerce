import type { Metadata } from "next"

import { users } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export const metadata: Metadata = {
  title: "Settings",
}

const NOTIFICATIONS = [
  {
    label: "Purchase receipts",
    sub: "Email a receipt for every sale and purchase.",
    on: true,
  },
  {
    label: "Product updates",
    sub: "Notify buyers when a product they own is updated.",
    on: true,
  },
  {
    label: "Marketing tips",
    sub: "Occasional ideas for selling more.",
    on: false,
  },
]

export default function SettingsPage() {
  const user = users[0]
  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-4 p-6">
      <div className="flex items-end gap-3">
        <div>
          <h1 className="font-heading text-2xl font-medium tracking-[-0.02em]">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Profile, storefront, and notification preferences.
          </p>
        </div>
        <div className="flex-1" />
        <Button>Save changes</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" defaultValue={user.name} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue={user.email} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Storefront</CardTitle>
          <CardDescription>Your public page lives at this handle.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-1.5">
            <Label htmlFor="handle">Handle</Label>
            <div className="flex h-8 items-center overflow-hidden rounded-lg border border-input">
              <span className="flex h-full items-center border-r border-input bg-muted pr-2 pl-2.5 font-mono text-[13px] text-muted-foreground">
                /@
              </span>
              <input
                id="handle"
                defaultValue="gabi"
                className="h-full flex-1 bg-transparent px-2.5 text-sm outline-none"
              />
            </div>
            <p className="text-[13px] text-muted-foreground">
              creatorcommerce.com<span className="font-mono">/@gabi</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery</CardTitle>
          <CardDescription>
            Where receipts and download links are sent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-1.5">
            <Label htmlFor="delivery-email">Delivery email</Label>
            <Input id="delivery-email" type="email" defaultValue={user.email} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col">
          {NOTIFICATIONS.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-4 border-b py-3 first:pt-0 last:border-b-0 last:pb-0"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-[13px] text-muted-foreground">{item.sub}</p>
              </div>
              <Switch defaultChecked={item.on} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
