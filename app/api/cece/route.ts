import { handleCece } from '@/lib/server/request/cece'

export const POST = handleCece

// An answer with a few tool steps takes seconds; the cap is what stops a stuck
// one from running to the platform default.
export const maxDuration = 60
