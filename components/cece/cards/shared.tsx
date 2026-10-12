"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"

import { Image, THUMBNAIL_QUALITY } from "@/components/image"
import { ProductImagePlaceholder } from "@/components/product-image-placeholder"
import { getProductCoversAction } from "@/lib/actions/cece"
import { cn } from "@/lib/utils"

// A path on this app. `//` and `/\` are excluded because browsers read both
// as the start of another host. Shared by the answer's markdown links and the
// cards: both render text the browser holds and sends back as history, so a
// forged history must not be able to put an off-site link in either.
export const APP_PATH = /^\/(?![\/\\])/

export function isAppPath(href: unknown): href is string {
  return typeof href === "string" && APP_PATH.test(href)
}

// A link when `href` is an app path, plain content otherwise.
export function SafeLink({
  href,
  className,
  children,
}: {
  href: unknown
  className?: string
  children: ReactNode
}) {
  if (!isAppPath(href)) return <span className={className}>{children}</span>
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

// Tool outputs carry ISO strings; a malformed one renders as nothing.
export function formatDate(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? "" : DATE_FORMAT.format(date)
}

type Covers = Record<number, string | null>

/**
 * The cover of each product a card shows, fetched by id once per card.
 * Tool outputs carry no image urls (see getProductCoversAction), so until this
 * resolves — and for any id the server won't vouch for — rows show the
 * placeholder.
 */
export function useProductCovers(ids: unknown[]): Covers {
  const valid = ids.filter((id): id is number => Number.isInteger(id) && (id as number) > 0)
  // A string key, so a fresh array of the same ids on each render doesn't
  // refetch.
  const key = valid.join(",")
  const [covers, setCovers] = useState<Covers>({})

  useEffect(() => {
    if (!key) return
    let current = true
    getProductCoversAction(key.split(",").map(Number))
      .then((result) => {
        if (current) setCovers(result)
      })
      // A failed lookup leaves the placeholders, which is all a cover is worth.
      .catch(() => {})
    return () => {
      current = false
    }
  }, [key])

  return covers
}

export function Thumb({ src, alt }: { src: string | null | undefined; alt: string }) {
  if (!src) {
    return (
      <ProductImagePlaceholder
        className="size-10 shrink-0 rounded-md"
        iconClassName="size-4"
      />
    )
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={40}
      height={40}
      quality={THUMBNAIL_QUALITY}
      className="size-10 shrink-0 rounded-md bg-muted object-cover"
    />
  )
}

// The frame every card shares: a header line, the body, an optional footer
// link to the page that has the full list.
export function ResultCard({
  title,
  footer,
  className,
  children,
}: {
  title: string
  footer?: { label: string; href: unknown }
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10",
        className,
      )}
    >
      <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
        {title}
      </div>
      {children}
      {footer && isAppPath(footer.href) && (
        <Link
          href={footer.href}
          className="border-t px-3 py-2 text-xs font-medium text-primary hover:bg-muted/50"
        >
          {footer.label}
        </Link>
      )}
    </div>
  )
}

export function RowList({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col divide-y">{children}</ul>
}

// One line of a list card: thumbnail, a title with a muted line under it, and
// a trailing value. The whole row is the link when it has one.
export function Row({
  href,
  thumb,
  title,
  meta,
  trailing,
}: {
  href?: unknown
  thumb?: ReactNode
  title: ReactNode
  meta?: ReactNode
  trailing?: ReactNode
}) {
  const content = (
    <>
      {thumb}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{title}</span>
        {meta && <span className="truncate text-xs text-muted-foreground">{meta}</span>}
      </span>
      {trailing && <span className="shrink-0 font-mono text-xs">{trailing}</span>}
    </>
  )
  const className = "flex items-center gap-3 px-3 py-2"
  return (
    <li>
      {isAppPath(href) ? (
        <Link href={href} className={cn(className, "hover:bg-muted/50")}>
          {content}
        </Link>
      ) : (
        <div className={className}>{content}</div>
      )}
    </li>
  )
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="px-3 py-3 text-xs text-muted-foreground">{children}</p>
}
