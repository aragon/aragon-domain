import type { Page } from '@/domain/primitives/pagination/Page';
import type { PageRequest } from '@/domain/primitives/pagination/PageRequest';
import type { TokenVotingMember } from './TokenVotingMember';

export interface TokenVotingMemberStore {
  /**
   * Finds members of a TokenVoting plugin scoped to its ERC20Votes token contract.
   * Returns a page of members sorted by voting power descending.
   */
  findMembersByPluginAndToken(
    pluginAddress: string,
    tokenContractAddress: string,
    page: PageRequest,
  ): Promise<Page<TokenVotingMember>>;
}
