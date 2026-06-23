import type { TokenVotingMember } from '@/domain/member/TokenVotingMember';

/**
 * Token-voting membership DTO — the type the frontend's token member list
 * renders from, regardless of whether the data came from the subdomain or
 * the legacy backend.
 *
 * Activity fields are unix-seconds timestamps. The frontend can render
 * them directly without resolving block numbers via RPC.
 */
export interface TokenVotingMemberDTO {
  address: string;
  ens: string | null;
  votingPower: string | null;
  metrics: {
    firstActivityTimestamp: number | null;
    lastActivityTimestamp: number | null;
    delegationCount: number;
  };
}

export function mapDomainToDTO(member: TokenVotingMember): TokenVotingMemberDTO {
  const first = member.firstActivityTimestamp;
  const last = member.lastActivityTimestamp;
  return {
    address: member.address.toHexString(),
    ens: member.ens,
    votingPower: member.votingPower.value.toBigNumber().toFixed(0),
    metrics: {
      firstActivityTimestamp: first === 0 ? null : first,
      lastActivityTimestamp: last === 0 ? null : last,
      delegationCount: member.delegationCount,
    },
  };
}
