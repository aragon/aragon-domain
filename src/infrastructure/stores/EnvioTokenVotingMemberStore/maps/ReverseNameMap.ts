import { z } from 'zod';

/**
 * Shape of a single `ReverseName` row.
 *
 * An address can have up to two rows on mainnet (legacy `coinType=60`
 * and ENSIP-19 `coinType=0x80000000`). The query orders by `coinType`
 * descending, so the first row per address in the dedupe pass is the
 * preferred one.
 */
const ReverseNameRowSchema = z.object({
  address: z.string(),
  coinType: z.string(),
  name: z.string(),
});

const FindReverseNamesResponseSchema = z.object({
  ReverseName: z.array(ReverseNameRowSchema),
});

export type ReverseNameDTO = z.infer<typeof ReverseNameRowSchema>;
export type FindReverseNamesResponse = z.infer<
  typeof FindReverseNamesResponseSchema
>;

/**
 * Trust boundary for the indexer's `FindReverseNames` response.
 * Asserts shape via Zod, dedupes to one row per address (keeping the
 * highest-coinType row since the query orders descending), and
 * returns the result as a `Map<lowercase address, name>`.
 *
 * Throws a `ZodError` if the shape doesn't match what we expect.
 */
export function mapDTOToDomain(raw: unknown): Map<string, string> {
  const parsed = FindReverseNamesResponseSchema.parse(raw);
  const namesByAddress = new Map<string, string>();
  for (const row of parsed.ReverseName) {
    const address = row.address.toLowerCase();
    if (!namesByAddress.has(address)) {
      namesByAddress.set(address, row.name);
    }
  }
  return namesByAddress;
}
