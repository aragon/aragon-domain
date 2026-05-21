import { z } from 'zod';
import { MemberProfileTextRecord } from '@/domain/member-profile/MemberProfileTextRecord';

/**
 * Shape of a single text-record row on the indexer.
 *
 * The `id` is structured as
 * `${chainId}-${resolverAddress}-${domainNode}-${version}-${key}`.
 * The first four segments are hyphen-free; the `key` segment (last)
 * may itself contain hyphens.
 */
const TextRecordRowSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string().nullable(),
});

const ResolverSchema = z.object({
  version: z.string(),
  texts: z.array(TextRecordRowSchema),
});

/**
 * Shape of the `FindMemberProfileTextRecords` GraphQL response. The
 * query selects up to one Domain by name; `Domain` is `[]` when no
 * such row exists and `resolver` is null when the subdomain has no
 * resolver assigned yet.
 */
const FindMemberProfileTextRecordsResponseSchema = z.object({
  Domain: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        resolver: ResolverSchema.nullable(),
      }),
    )
    .max(1),
});

export type TextRecordRowDTO = z.infer<typeof TextRecordRowSchema>;
export type FindMemberProfileTextRecordsResponse = z.infer<
  typeof FindMemberProfileTextRecordsResponseSchema
>;

/**
 * Extracts the `${version}` segment from a TextRecord id. The first
 * four segments (chainId, resolverAddress, domainNode, version) never
 * contain a hyphen, so `split('-')[3]` is safe.
 */
export function extractVersion(id: string): string {
  return id.split('-')[3] ?? '';
}

/**
 * Trust boundary for the indexer's `FindMemberProfileTextRecords`
 * response. Asserts the shape via Zod, filters out cleared rows and
 * rows superseded by `VersionChanged` (kept around on the indexer but
 * logically invalid), and constructs the domain value objects.
 *
 * Throws a `ZodError` if the shape doesn't match what we expect.
 */
export function mapDTOToDomain(raw: unknown): MemberProfileTextRecord[] {
  const parsed = FindMemberProfileTextRecordsResponseSchema.parse(raw);
  const domain = parsed.Domain[0];

  // No row for this name on the indexer.
  if (!domain) return [];
  // Domain exists but `setResolver` has not been called for it yet.
  if (!domain.resolver) return [];

  const liveVersion = domain.resolver.version;
  const live: MemberProfileTextRecord[] = [];
  for (const text of domain.resolver.texts) {
    if (text.value === null) continue;
    if (extractVersion(text.id) !== liveVersion) continue;
    live.push(
      MemberProfileTextRecord.create({ key: text.key, value: text.value }),
    );
  }
  return live;
}
