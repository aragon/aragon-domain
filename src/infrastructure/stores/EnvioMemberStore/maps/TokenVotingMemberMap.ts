import { z } from 'zod';
import { Address, assertHexString } from '@/domain/primitives';
import { TokenVotingMember } from '@/domain/member/TokenVotingMember';
import { VotingPower } from '@/domain/voting-power/VotingPower';

/**
 * Shape of an `ERC20VotesDelegate` row on the indexer.
 *
 * `firstVotingPowerChangeTimestamp` / `lastVotingPowerChangeTimestamp`
 * are nullable: a delegate row can exist without ever having had a
 * DelegateVotesChanged event (e.g. created from a `+1` to
 * delegationCount via a DelegateChanged event on a zero balance).
 */
const ERC20VotesDelegateSchema = z.object({
  id: z.string(),
  chainId: z.number(),
  tokenContractAddress: z.string(),
  delegateAddress: z.string(),
  votingPower: z.string(),
  delegationCount: z.number(),
  firstVotingPowerChangeTimestamp: z.string().nullable(),
  lastVotingPowerChangeTimestamp: z.string().nullable(),
});

const MemberMetricsSchema = z.object({
  id: z.string(),
  chainId: z.number(),
  pluginAddress: z.string(),
  memberAddress: z.string(),
  firstActivityTimestamp: z.string(),
  lastActivityTimestamp: z.string(),
});

/**
 * Shape of the `FindMembers` GraphQL response. Three top-level lists:
 *
 *   - `ERC20VotesDelegate`     — the requested page of delegates
 *   - `AllERC20VotesDelegate`  — every delegate id (used for total count)
 *   - `MemberMetrics`          — all member-metrics rows for the plugin
 *
 * The merge of `ERC20VotesDelegate` (generic / chain-wide) with
 * `MemberMetrics` (Aragon-specific) happens client-side; see the
 * store for the orchestration.
 */
const FindMembersResponseSchema = z.object({
  ERC20VotesDelegate: z.array(ERC20VotesDelegateSchema),
  AllERC20VotesDelegate: z.array(z.object({ id: z.string() })),
  MemberMetrics: z.array(MemberMetricsSchema),
});

export type ERC20VotesDelegateDTO = z.infer<typeof ERC20VotesDelegateSchema>;
export type MemberMetricsDTO = z.infer<typeof MemberMetricsSchema>;
export type FindMembersResponse = z.infer<typeof FindMembersResponseSchema>;

/**
 * Trust boundary for the indexer's `FindMembers` response. Throws a
 * `ZodError` if the shape doesn't match.
 */
export function parseFindMembersResponse(raw: unknown): FindMembersResponse {
  return FindMembersResponseSchema.parse(raw);
}

/**
 * Smallest of the defined inputs (treats `null`/`undefined` as
 * "no signal"). Returns `0` if neither side has a value.
 */
function minDefined(...values: Array<string | null | undefined>): number {
  let min: number | undefined;
  for (const v of values) {
    if (v == null) continue;
    const n = Number(v);
    if (min === undefined || n < min) min = n;
  }
  return min ?? 0;
}

/**
 * Largest of the defined inputs. Returns `0` if neither side has a
 * value.
 */
function maxDefined(...values: Array<string | null | undefined>): number {
  let max: number | undefined;
  for (const v of values) {
    if (v == null) continue;
    const n = Number(v);
    if (max === undefined || n > max) max = n;
  }
  return max ?? 0;
}

/**
 * Maps a single `ERC20VotesDelegate` row (plus its companion
 * `MemberMetrics` row and any attached ENS name) to a domain
 * `TokenVotingMember`. Verifies that the address fields look like
 * `0x`-prefixed hex before passing them through to the domain
 * primitives — `Address.fromHexString` does the final shape check.
 */
export function mapDTOToDomain(
  delegate: ERC20VotesDelegateDTO,
  metrics: MemberMetricsDTO | undefined,
  ens: string | null,
): TokenVotingMember {
  assertHexString(
    delegate.delegateAddress,
    'delegateAddress must be a 0x-prefixed hex string',
  );

  // Activity is the merge of two signals:
  //   - MemberMetrics: VoteCast / ProposalCreated activity in this plugin
  //   - ERC20VotesDelegate: voting-power changes for this delegate-token pair
  // The indexer keeps these denormalized across the generic / Aragon
  // partition; the merge happens here so that a future split into two
  // indexers needs no schema change beyond two GraphQL endpoints.
  const firstActivityTimestamp = minDefined(
    metrics?.firstActivityTimestamp,
    delegate.firstVotingPowerChangeTimestamp,
  );
  const lastActivityTimestamp = maxDefined(
    metrics?.lastActivityTimestamp,
    delegate.lastVotingPowerChangeTimestamp,
  );

  return TokenVotingMember.create({
    address: Address.fromHexString(delegate.delegateAddress),
    votingPower: VotingPower.fromBigInt(BigInt(delegate.votingPower)),
    ens,
    firstActivityTimestamp,
    lastActivityTimestamp,
    delegationCount: delegate.delegationCount,
  });
}
