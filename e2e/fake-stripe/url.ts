// Where the fake Stripe API listens. Shared by the server itself, the
// Playwright config (which starts it and points the dev server at it) and the
// specs (which read back what it recorded). 12111 is stripe-mock's port, so
// anyone who has met that tool recognises what is behind it.
export const FAKE_STRIPE_URL = 'http://localhost:12111'
