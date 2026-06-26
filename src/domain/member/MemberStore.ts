import type { Address } from '@/domain/primitives';
import type { Page } from '@/domain/primitives/pagination/Page';
import type { PageRequest } from '@/domain/primitives/pagination/PageRequest';
import type { MemberGovernanceMetrics } from './MemberGovernanceMetrics';
import type { TokenVotingMemberRecord } from './TokenVotingMemberRecord';

export interface TokenVotingMemberData {
  record: TokenVotingMemberRecord;
  metrics: MemberGovernanceMetrics | null;
}

export interface MemberStore {
  /**
   * Finds members of a TokenVoting plugin scoped to its token contract.
   * Returns a page of on-chain records paired with their governance
   * metrics, sorted by voting power descending.
   */
  findTokenVotingMembers(
    pluginAddress: Address,
    tokenContractAddress: Address,
    page: PageRequest,
  ): Promise<Page<TokenVotingMemberData>>;
}
