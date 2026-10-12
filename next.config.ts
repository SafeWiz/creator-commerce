import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

/**
 * The UploadThing app id, read out of UPLOADTHING_TOKEN — a base64 JSON object
 * `{ apiKey, appId, regions }` (uploadthing's `UploadThingToken` schema). Read
 * here rather than from a separate variable so the image allowlist can never
 * name a different app than the one uploads go to.
 *
 * Absent or malformed means no uploads can happen either, so no remote image
 * is allowed — a fresh clone without a token has none to show.
 */
function readUploadThingAppId(token: string | undefined): string | null {
  if (!token) return null
  try {
    const { appId } = JSON.parse(Buffer.from(token, 'base64').toString('utf8'))
    // Lands in a hostname, so only what an app id is made of.
    return typeof appId === 'string' && /^[a-z0-9]+$/i.test(appId) ? appId : null
  } catch {
    return null
  }
}

const uploadThingAppId = readUploadThingAppId(process.env.UPLOADTHING_TOKEN)

const nextConfig: NextConfig = {
  // nodemailer is a CommonJS node library with dynamic requires; bundling it
  // into the server output breaks those. Loaded from node_modules at runtime
  // instead.
  serverExternalPackages: ['nodemailer'],
  // Next 16 locks a build directory to one running `next dev`. Playwright's
  // webServer sets NEXT_DIST_DIR=.next-e2e so its test server never fights a
  // hand-started `next dev` (default .next) for the same lockfile.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  // The share cards read their TTFs from disk at request time
  // (lib/server/og/fonts.ts), and a file that isn't in a route's trace isn't
  // in its serverless function on Vercel — the card would fail to render
  // there while working locally. Keys are picomatch globs over the route
  // path, which for a card is e.g. /[handle]/opengraph-image-<hash>/
  // [__metadata_id__]; values are globs from the project root.
  // Both keys because the generated route's last segment is the metadata
  // id; the TTFs are ~230 KB.
  outputFileTracingIncludes: {
    '**/opengraph-image*': ['./assets/fonts/**'],
    '**/opengraph-image*/**': ['./assets/fonts/**'],
  },
  images: {
    // UploadThing serves files from https://<appId>.ufs.sh/f/<key>
    // (uploadthing/server's urlBase, default `subdomain` location). Pinned to
    // this deployment's own app, not `**.ufs.sh`: every UploadThing customer
    // shares that domain, and a wildcard would let anyone point the optimizer
    // at their own app's files on our bill. `search: ''` refuses a query
    // string, which ufsUrls never carry — otherwise each `?x=…` variant of one
    // url is a separate optimization.
    remotePatterns: uploadThingAppId
      ? [{ protocol: 'https', hostname: `${uploadThingAppId}.ufs.sh`, pathname: '/f/**', search: '' }]
      : [],
    // The productImage route caps uploads at '4MB' (lib/server/uploadthing.ts),
    // which UploadThing reads as 4 × 1024². Anything bigger did not come from
    // an upload, so refuse it before buffering it. Default is 50 MB.
    maximumResponseBody: 4 * 1024 * 1024,
    // A ufsUrl answers directly. Redirects would be followed without
    // re-checking remotePatterns, so none are followed at all.
    maximumRedirects: 0,
    // The widths a srcset may ask for. The widest box is the product gallery at
    // 546 CSS px, so 1920 covers it at 3× DPR; the defaults' 2048 and 3840 only
    // add optimizations no layout requests. imageSizes covers the 96 px
    // thumbnails at 1–3× and the cards' 376 px box at 1×.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [96, 192, 288, 384],
    // The optimizer 400s any `q` not listed here, and the default loader snaps
    // a `quality` prop to the nearest entry. 75 (Next's default) is everything
    // a buyer judges a product by — cards and the gallery. 50 is for the 96 px
    // thumbnails (cart, product form), where artifacts are too small to see.
    // Those fetch widths 96–288 and the cards 384 up, so the two qualities
    // barely share a (url, width) and add almost no cache entries.
    qualities: [50, 75],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400
  },
  async headers() {
    return [
      {
        // The consent page's url carries a pending authorization code, and its
        // Allow button grants an outside app access to the account. Neither the
        // url (Referer) nor the page (framing, clickjacking) may leave it.
        source: '/oauth/consent',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ]
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "creatorcommerce",

  project: "creator-commerce",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
