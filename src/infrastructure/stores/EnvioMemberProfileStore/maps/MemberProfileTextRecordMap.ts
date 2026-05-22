import { z } from 'zod';
import { MemberProfileResolver } from '@/domain/member-profile/MemberProfileResolver';

const TextRecordRowSchema = z.object({
  key: z.string(),
  value: z.string().nullable(),
  version: z.string(),
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
 * Trust boundary for the indexer's `FindMemberProfileTextRecords`
 * response.
 *
 * Returns `null` when the subdomain is unknown to the indexer or
 * exists but has no resolver assigned yet.
 */
export function mapDTOToDomain(raw: unknown): MemberProfileResolver | null {
  const parsed = FindMemberProfileTextRecordsResponseSchema.parse(raw);
  const domain = parsed.Domain[0];

  // No row for this name on the indexer.
  if (!domain) return null;
  // Domain exists but `setResolver` has not been called for it yet.
  if (!domain.resolver) return null;

  return MemberProfileResolver.create({
    version: domain.resolver.version,
    entries: domain.resolver.texts.map((text) => ({
      key: text.key,
      value: text.value,
      version: text.version,
    })),
  });
}
