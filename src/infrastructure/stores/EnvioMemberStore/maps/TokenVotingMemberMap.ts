import { z } from 'zod';
import { TokenVotingMemberRecord } from '@/domain/member/TokenVotingMemberRecord';
import { Address, assertHexString, zExtended } from '@/domain/primitives';
import { VotingPower } from '@/domain/voting-power/VotingPower';

const ERC20VotesDelegateSchema = z.object({
  id: z.string(),
  chainId: z.number(),
  tokenContractAddress: zExtended.hexString(),
  delegateAddress: zExtended.hexString(),
  votingPower: z.string(),
  delegationCount: z.number(),
  firstVotingPowerChangeTimestamp: z.string().nullable(),
  lastVotingPowerChangeTimestamp: z.string().nullable(),
});

const MemberMetricsSchema = z.object({
  id: z.string(),
  chainId: z.number(),
  pluginAddress: zExtended.hexString(),
  memberAddress: zExtended.hexString(),
  firstActivityTimestamp: z.string(),
  lastActivityTimestamp: z.string(),
});

const FindMembersResponseSchema = z.object({
  ERC20VotesDelegate: z.array(ERC20VotesDelegateSchema),
  AllERC20VotesDelegate: z.array(z.object({ id: z.string() })),
  MemberMetrics: z.array(MemberMetricsSchema),
});

export type ERC20VotesDelegateDTO = z.infer<typeof ERC20VotesDelegateSchema>;
export type MemberMetricsDTO = z.infer<typeof MemberMetricsSchema>;
export type FindMembersResponse = z.infer<typeof FindMembersResponseSchema>;

interface FindMembersResult {
  records: TokenVotingMemberRecord[];
  totalRecords: number;
}

export function mapDTOToDomain(raw: unknown): FindMembersResult {
  const data = FindMembersResponseSchema.parse(raw);

  const metricsByMember = new Map(
    data.MemberMetrics.map((metrics) => [
      metrics.memberAddress.toLowerCase(),
      metrics,
    ]),
  );

  const records = data.ERC20VotesDelegate.map((delegate) =>
    toRecord(
      delegate,
      metricsByMember.get(delegate.delegateAddress.toLowerCase()),
    ),
  );

  return { records, totalRecords: data.AllERC20VotesDelegate.length };
}

/**
 * Assembles a single domain `TokenVotingMemberRecord` from a delegate
 * row and its optional companion `MemberMetrics` row.
 */
function toRecord(
  delegate: ERC20VotesDelegateDTO,
  metrics: MemberMetricsDTO | undefined,
): TokenVotingMemberRecord {
  // A member's activity window spans both their governance activity
  // (MemberMetrics: VoteCast / ProposalCreated) and their voting-power
  // changes (ERC20VotesDelegate). Take the earliest start and latest end
  // across whichever signals are present; 0 means "no activity recorded".
  const firstSignals = [
    metrics?.firstActivityTimestamp,
    delegate.firstVotingPowerChangeTimestamp,
  ]
    .filter((t): t is string => t != null)
    .map(Number);
  const lastSignals = [
    metrics?.lastActivityTimestamp,
    delegate.lastVotingPowerChangeTimestamp,
  ]
    .filter((t): t is string => t != null)
    .map(Number);

  return TokenVotingMemberRecord.create({
    address: Address.fromHexString(delegate.delegateAddress),
    votingPower: VotingPower.fromBigInt(BigInt(delegate.votingPower)),
    firstActivityTimestamp:
      firstSignals.length > 0 ? Math.min(...firstSignals) : 0,
    lastActivityTimestamp:
      lastSignals.length > 0 ? Math.max(...lastSignals) : 0,
    delegationCount: delegate.delegationCount,
  });
}
