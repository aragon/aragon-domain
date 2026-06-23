import type { Page } from '@/domain/primitives/pagination/Page';
import type { PageRequest } from '@/domain/primitives/pagination/PageRequest';
import type { TokenVotingMember } from './TokenVotingMember';

/**
 * Member-fetching boundary for the membership domain. Holds the
 * token-voting query today; other member queries can be added here.
 */
export interface MemberStore {
  /**
   * Finds members of a TokenVoting plugin scoped to its ERC20Votes token contract.
   * Returns a page of members sorted by voting power descending.
   */
  findTokenVotingMembers(
    pluginAddress: string,
    tokenContractAddress: string,
    page: PageRequest,
  ): Promise<Page<TokenVotingMember>>;
}
