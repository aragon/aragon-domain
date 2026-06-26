import type { Address } from '@/domain/primitives';
import type { Page } from '@/domain/primitives/pagination/Page';
import type { PageRequest } from '@/domain/primitives/pagination/PageRequest';
import type { TokenVotingMemberRecord } from './TokenVotingMemberRecord';

export interface MemberStore {
  /**
   * Finds members of a TokenVoting plugin scoped to its token contract.
   * Returns a page of member records sorted by voting power descending.
   */
  findTokenVotingMembers(
    pluginAddress: Address,
    tokenContractAddress: Address,
    page: PageRequest,
  ): Promise<Page<TokenVotingMemberRecord>>;
}
