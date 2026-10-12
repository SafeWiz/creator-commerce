import { ImageResponse } from "next/og"

import { Logo } from "@/components/logo"
import { emailTheme } from "@/lib/email-theme.generated"

// The home-screen icon, drawn from the same component as app/icon.tsx. Reads
// no data, so Next prerenders it at build. 180×180 is the size iOS asks for.
export const size = { width: 180, height: 180 }
export const contentType = "image/png"

// iOS rounds the corners itself and adds no margin, so the mark sits inset
// rather than edge to edge, where the corner mask would clip the arcs.
const MARK_SIZE = 120

export default function AppleIcon() {
  return new ImageResponse(
    (
      // Opaque: iOS fills a transparent home-screen icon with black.
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        <Logo
          size={MARK_SIZE}
          colors={{ foreground: emailTheme.colors.foreground, primary: emailTheme.colors.primary }}
        />
      </div>
    ),
    size,
  )
}
