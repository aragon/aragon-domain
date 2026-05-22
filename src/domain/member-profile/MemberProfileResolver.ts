import { ValueObject } from 'ddd-core-ts';
import { z } from 'zod';
import { MemberProfileTextRecord } from './MemberProfileTextRecord';

const MemberProfileResolverEntrySchema = z.object({
  key: z.string().min(1, 'entry key must not be empty'),
  value: z.string().nullable(),
  version: z.string().min(1, 'entry version must not be empty'),
});

const MemberProfileResolverPropsSchema = z.object({
  version: z.string().min(1, 'resolver version must not be empty'),
  entries: z.array(MemberProfileResolverEntrySchema).readonly(),
});

type MemberProfileResolverProps = z.output<
  typeof MemberProfileResolverPropsSchema
>;

/**
 * The ENS Public Resolver attached to a member's
 * subdomain. Owns the resolver's current version plus the candidate
 * text-record entries the indexer has seen for it.
 *
 * Liveness rule (encoded in `liveTextRecords`):
 *   1. an entry with `value === null` has been cleared on-chain and is
 *      not a live record;
 *   2. an entry whose `version` differs from the resolver's current
 *      `version` was invalidated by a later `VersionChanged` event and
 *      is not a live record.
 *
 * This rule mirrors the on-chain `VersionChanged` semantic of the
 * canonical ENS Public Resolver: bumping the version logically clears
 * every prior record without touching individual rows.
 */
export class MemberProfileResolver extends ValueObject<MemberProfileResolverProps> {
  get version(): string {
    return this.props.version;
  }

  /**
   * Returns the text records that are currently live on this resolver.
   * Drops cleared rows (`value === null`) and rows superseded by a
   * later `VersionChanged` bump.
   */
  liveTextRecords(): MemberProfileTextRecord[] {
    const live: MemberProfileTextRecord[] = [];
    for (const entry of this.props.entries) {
      if (entry.value === null) continue;
      if (entry.version !== this.props.version) continue;
      live.push(
        MemberProfileTextRecord.create({
          key: entry.key,
          value: entry.value,
        }),
      );
    }
    return live;
  }

  static create(
    props: z.input<typeof MemberProfileResolverPropsSchema>,
  ): MemberProfileResolver {
    const validated = MemberProfileResolverPropsSchema.parse(props);
    return new MemberProfileResolver(validated);
  }
}
