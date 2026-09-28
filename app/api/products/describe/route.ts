import { handleDescribeProduct } from '@/lib/server/request/describe-product'

export const POST = handleDescribeProduct

// A generation streams for 10-30 seconds. The cap is what stops a stuck one
// from running to the platform default.
export const maxDuration = 60
