/**
 * Deletes product images that were uploaded and never used.
 *
 * The app cleans up every case it can see — an image dropped from a form, a
 * discarded edit, a deleted product. What it cannot see is a form abandoned: a
 * tab closed, a browser Back, a session that ended. Those leave a
 * product_image_uploads row and a file, and this is what collects them.
 *
 * A claimed upload has no row left, so age alone finds the candidates. The
 * `not exists` below is the backstop for a row whose url is live anyway — a
 * commit that wrote the array but did not get as far as deleting its rows.
 *
 * Dry run unless --delete. Deleting is not reversible and the rows name real
 * files, so the default is to say what would happen.
 *
 * Usage:
 *   npm run cleanup:images
 *   npm run cleanup:images -- --delete
 *   npm run cleanup:images -- --older-than=7d --delete
 */
import { and, inArray, lt, sql } from 'drizzle-orm'
import { UTApi } from 'uploadthing/server'

import db from '@/lib/server/db'
import {
  productImageUploadsTable,
  productsTable,
} from '@/lib/server/db/schemas/product'

// Long enough that no real editing session is swept out from under a user, short
// enough that abandoned uploads do not accumulate for a week.
const DEFAULT_RETENTION_HOURS = 24

// The app's own UTApi swallows delete failures, because there the user's action
// has already succeeded and a leftover file is only cost. Here a failure is the
// result, so this one is built locally and left to throw.
const utapi = new UTApi()

// UploadThing takes a batch; a sweep after a long gap can find far more than one
// request should carry.
const DELETE_BATCH = 100

function parseRetentionHours(argv: string[]) {
  const flag = argv.find((arg) => arg.startsWith('--older-than='))
  if (!flag) return DEFAULT_RETENTION_HOURS

  const value = flag.slice('--older-than='.length)
  const match = /^(\d+)([hd])$/.exec(value)
  if (!match) {
    throw new Error(`--older-than must look like 24h or 7d, got "${value}"`)
  }

  const [, amount, unit] = match
  return Number(amount) * (unit === 'd' ? 24 : 1)
}

function formatAge(createdAt: Date) {
  const hours = Math.floor((Date.now() - createdAt.getTime()) / 3_600_000)
  return hours >= 48 ? `${Math.floor(hours / 24)}d ago` : `${hours}h ago`
}

async function main() {
  const argv = process.argv.slice(2)

  // A misspelled flag must not fall through to the defaults: `--older-than 7d`
  // (a space, not an `=`) would otherwise be dropped, and the run would delete a
  // day's worth of uploads while the operator believed they had asked for a
  // week's.
  const unknown = argv.filter(
    (arg) => arg !== '--delete' && !arg.startsWith('--older-than='),
  )
  if (unknown.length > 0) {
    throw new Error(
      `Unknown argument(s): ${unknown.join(' ')}. Expected --delete and/or --older-than=24h.`,
    )
  }

  const shouldDelete = argv.includes('--delete')
  const hours = parseRetentionHours(argv)
  const cutoff = new Date(Date.now() - hours * 3_600_000)

  const orphans = await db
    .select({
      id: productImageUploadsTable.id,
      key: productImageUploadsTable.key,
      url: productImageUploadsTable.url,
      ownerId: productImageUploadsTable.ownerId,
      createdAt: productImageUploadsTable.createdAt,
    })
    .from(productImageUploadsTable)
    .where(
      and(
        lt(productImageUploadsTable.createdAt, cutoff),
        // Correlated on the outer row's url. A claimed upload has no row here at
        // all, so this only catches a row left behind by a commit that wrote the
        // array without deleting it.
        sql`not exists (
          select 1 from ${productsTable}
          where ${productsTable.images} @> array[${productImageUploadsTable.url}]::text[]
        )`,
      ),
    )

  if (orphans.length === 0) {
    console.log(`No orphaned staged images older than ${hours}h.`)
    return
  }

  console.log(
    shouldDelete
      ? `${orphans.length} orphaned staged images older than ${hours}h:`
      : `DRY RUN — nothing deleted\n${orphans.length} orphaned staged images older than ${hours}h:`,
  )
  for (const row of orphans) {
    console.log(
      `  ${row.key}  ${row.url}  owner ${row.ownerId}  ${formatAge(row.createdAt)}`,
    )
  }

  if (!shouldDelete) {
    console.log('\nrun with --delete to remove')
    return
  }

  // Files first, rows second. A failed storage delete leaves a row the next run
  // retries; the other order loses the key and the file becomes unreachable.
  for (let i = 0; i < orphans.length; i += DELETE_BATCH) {
    const batch = orphans.slice(i, i + DELETE_BATCH)
    // deleteFiles resolves rather than throwing when UploadThing accepts the
    // request but reports it did not delete — so without this check the rows
    // would go anyway and the ordering above would buy nothing. `deletedCount`
    // is deliberately not compared against the batch size: a key already gone
    // from storage counts as nothing deleted, and that row is exactly one that
    // should go.
    const { success } = await utapi.deleteFiles(batch.map((row) => row.key))
    if (!success) {
      throw new Error(
        `UploadThing refused to delete ${batch.length} file(s), starting at ${batch[0]?.key}. Rows kept; run again.`,
      )
    }

    await db
      .delete(productImageUploadsTable)
      .where(
        inArray(
          productImageUploadsTable.id,
          batch.map((row) => row.id),
        ),
      )
  }

  console.log(`\ndeleted ${orphans.length} files, ${orphans.length} rows`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
