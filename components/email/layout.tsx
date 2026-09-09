import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Tailwind,
  pixelBasedPreset,
} from '@react-email/components'
import type { ReactNode } from 'react'

import { emailTheme } from '@/lib/email-theme.generated'

/**
 * The shell every email shares.
 *
 * No 'server-only' marker, deliberately: these components are plain React and
 * are imported by the dev preview route outside any request. They read no
 * environment — every url arrives as a prop — which is what keeps them that way.
 *
 * pixelBasedPreset is required rather than decorative: Tailwind's default rem
 * units are unsupported in several mail clients, and the preset rewrites the
 * utilities to px.
 *
 * The font stack is websafe and inline. --font-sans points at a next/font family
 * that does not exist in a mail client, so the generator does not emit fonts.
 */
const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

export function EmailLayout({
  preview,
  children,
}: {
  preview: string
  children: ReactNode
}) {
  return (
    <Html lang="en">
      <Head />
      {/* The grey line an inbox shows next to the subject. Without it, clients
          invent one from the first words of the body. */}
      <Preview>{preview}</Preview>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: emailTheme.colors,
              borderRadius: { DEFAULT: emailTheme.radius },
            },
          },
        }}
      >
        <Body
          className="bg-muted text-foreground"
          style={{ fontFamily: FONT_STACK }}
        >
          <Container className="mx-auto my-[32px] w-[560px] rounded bg-background p-[32px]">
            {children}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
