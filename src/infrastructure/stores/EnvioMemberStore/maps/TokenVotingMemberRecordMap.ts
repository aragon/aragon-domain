import { z } from 'zod';
import { TokenVotingMemberRecord } from '@/domain/member/TokenVotingMemberRecord';
import { Address, zExtended } from '@/domain/primitives';
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

/**
 * Shape of the `FindDelegates` response: the requested page of delegates
 * plus the id-only list the total count is derived from.
 */
const ResponseSchema = z.object({
  ERC20VotesDelegate: z.array(ERC20VotesDelegateSchema),
  AllERC20VotesDelegate: z.array(z.object({ id: z.string() })),
});

export interface TokenVotingMemberRecordsResult {
  records: TokenVotingMemberRecord[];
  totalRecords: number;
}

export function mapDTOToDomain(raw: unknown): TokenVotingMemberRecordsResult {
  const data = ResponseSchema.parse(raw);

  const records = data.ERC20VotesDelegate.map((delegate) =>
    TokenVotingMemberRecord.create({
      address: Address.fromHexString(delegate.delegateAddress),
      votingPower: VotingPower.fromBigInt(BigInt(delegate.votingPower)),
      delegationCount: delegate.delegationCount,
      firstVotingPowerChangeTimestamp: toTimestamp(
        delegate.firstVotingPowerChangeTimestamp,
      ),
      lastVotingPowerChangeTimestamp: toTimestamp(
        delegate.lastVotingPowerChangeTimestamp,
      ),
    }),
  );

  return { records, totalRecords: data.AllERC20VotesDelegate.length };
}

/** Parses a nullable unix-seconds string into a Date, preserving null. */
function toTimestamp(value: string | null): Date | null {
  return value != null ? new Date(Number(value) * 1000) : null;
}
