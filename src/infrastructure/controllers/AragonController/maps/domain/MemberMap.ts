import type { Member } from '@/domain/member/Member';

/**
 * DTO matching the frontend's ITokenMember interface.
 *
 * Activity fields are unix-seconds timestamps. The frontend can render
 * them directly without resolving block numbers via RPC.
 */
export interface MemberDTO {
  address: string;
  ens: string | null;
  votingPower: string | null;
  metrics: {
    firstActivityTimestamp: number | null;
    lastActivityTimestamp: number | null;
    delegationCount: number;
  };
}

export function mapDomainToDTO(member: Member): MemberDTO {
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
