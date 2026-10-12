import { ImageResponse } from "next/og"

import { Logo } from "@/components/logo"
import { emailTheme } from "@/lib/email-theme.generated"

// Reads no data, so Next prerenders it at build. Drawn from the same component
// as the app's headers, so the tab icon can't drift from the logo.
export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      // White behind the mark: transparent left the near-black arc unreadable
      // on a dark tab bar.
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#ffffff" }}>
        <Logo
          size={size.width}
          colors={{ foreground: emailTheme.colors.foreground, primary: emailTheme.colors.primary }}
        />
      </div>
    ),
    size,
  )
}
