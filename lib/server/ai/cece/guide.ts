import 'server-only'

import { appUrl } from '@/lib/server/app-url'

/**
 * What Cece knows about how the platform works, one entry per topic.
 *
 * Hand-written and kept true to the code — Cece is told to answer how-to
 * questions from this and nothing else, so a wrong line here is a wrong
 * answer. When a feature changes, the topic that describes it changes in the
 * same commit.
 *
 * Deliberately not derived from /help/first-sale: that page promises things
 * the code does not do (2 GB files, connecting Stripe in Settings).
 *
 * The ids are a const tuple so get_help_topic's zod enum is built from them
 * and cannot drift.
 */
export const HELP_TOPIC_IDS = [
  'getting-started',
  'products',
  'storefront',
  'selling-and-payouts',
  'buying',
  'account',
  'analytics',
  'connect-your-ai',
] as const

export type HelpTopicId = (typeof HELP_TOPIC_IDS)[number]

export const HELP_TOPICS: Record<HelpTopicId, { summary: string; content: string }> = {
  'getting-started': {
    summary: 'From a new account to the first sale.',
    content: `Every account can both sell and buy.

1. Create a product at Products → New product (/products/new): a name, a price in RON, and the file buyers get (one file, up to 100MB).
2. Add images and a description. "Generate with AI" next to Description can draft one from the file.
3. Press "Save draft" to keep it private, or "Publish" to put it on your storefront.
4. Share your storefront link, /@yourhandle. Visitors can browse and add to cart without an account; they sign in at checkout.
5. Paid orders appear on /sales and on the dashboard (/dashboard).`,
  },
  products: {
    summary: 'Creating and editing products: file, images, price, AI description, draft vs published, deleting.',
    content: `Create at /products/new, edit at /products/{id}. Your list is at /products.

- Name: 3 to 255 characters.
- Price: in RON, from 2 to 999,999.99. The app uses one currency.
- File: exactly one, up to 100MB. It is what buyers download after paying. It cannot be replaced once the product exists — to sell a different file, create a new product.
- Images: up to 8 per product, 4MB each. The first image is the cover. New or removed images only take effect when you press Save; uploads from a form that was never saved are cleaned up after 24 hours.
- "Generate with AI" writes a description from the file. It reads PDFs and PNG, JPEG, WebP and GIF images up to 20MB; other files are described from their name, type and size only. 20 generations per 24 hours. Nothing is saved until you press Save, and Undo puts back the text you had.
- Draft: only you can see it, including a preview at its storefront url. Published: listed on your storefront and in Explore. To unpublish, open the product and press "Save draft".
- Deleting removes the product from your list, your storefront and Explore. Buyers who already bought it keep their download.`,
  },
  storefront: {
    summary: 'Your public page at /@handle and product pages.',
    content: `Your storefront is /@yourhandle. It lists your published products; each has its own page at /@yourhandle/{id}/{slug} with a Buy button.

While signed in, you also see your own drafts there, marked with a badge. Nobody else does.

Your handle is chosen at signup. Changing it is not available in the app yet.`,
  },
  'selling-and-payouts': {
    summary: 'How buyers pay, when a sale counts, emails, and payouts.',
    content: `Buyers pay through Stripe Checkout, in RON. A sale is recorded once Stripe confirms the payment; a checkout that was started and abandoned is not a sale.

For every paid order the buyer gets a receipt by email and you get a notification per order (without the buyer's details).

Your sales are listed at /sales with totals for revenue and units sold.

Payouts: connecting your own Stripe account and scheduled payouts are not available in the app yet. Do not promise payout timing.`,
  },
  buying: {
    summary: 'Cart, checkout, purchases and downloads.',
    content: `- Explore (/explore) searches published products from other creators; type at least 3 characters.
- Add to cart from any product page, no account needed. The cart (/cart) holds one of each product, up to 20 products.
- Checkout requires signing in; you come back to the cart with everything still in it. Payment is on Stripe's page.
- After paying you land on /purchases, your order history.
- Files are at /downloads. Each download link works for a few minutes; click Download again for a fresh one.
- The wishlist (/wishlist) is not available yet.`,
  },
  account: {
    summary: 'Email verification, password reset, settings.',
    content: `- Email verification: a banner in the dashboard asks you to verify. You can resend the email from /verify-email. Using the app does not require it.
- Forgot your password: /forgot-password sends a reset link.
- Settings (/settings) shows your profile and handle. Saving changes there is not available yet.
- Sign out is at the bottom of the sidebar.`,
  },
  analytics: {
    summary: 'Dashboard numbers: revenue, units, top products, conversion.',
    content: `The dashboard (/dashboard) shows revenue and units sold for the last 30 days compared with the 30 days before, your top products by revenue, and how many products are published and in draft.

Conversion is unique buyers divided by unique people who viewed your storefront or a product page, or added one of your products to cart, over the last 30 days. Your own views while signed in are not counted. Visitors with ad blockers can buy without being counted as viewers, so the rate can read higher than reality; it is capped at 100%. It shows a dash when analytics is not set up.

/sales shows all-time revenue and units.`,
  },
  'connect-your-ai': {
    summary: 'Using Creator Commerce from Claude, ChatGPT or another AI app (MCP).',
    content: `Any AI app that supports MCP connectors (Claude, ChatGPT, Cursor and others) can look things up in your account.

1. In the app, add a custom connector or remote MCP server with the address ${appUrl}/api/mcp.
2. The app opens a browser window. Sign in to Creator Commerce if asked, check the app's name, and choose Allow.
3. The app can then look up what Cece can: your products, sales, purchases, downloads and account status, the platform guide, and marketplace search.

Access is read-only: a connected app cannot change anything. Removing an app's access from within Creator Commerce is not available yet.`,
  },
}
