import type { UseCase } from 'ddd-core-ts';
import type { MemberStore } from '@/domain/member/MemberStore';
import type { TokenVotingMember } from '@/domain/member/TokenVotingMember';
import type { Page } from '@/domain/primitives/pagination/Page';
import type { PageRequest } from '@/domain/primitives/pagination/PageRequest';

export interface GetTokenVotingMembershipUseCaseProps {
  pluginAddress: string;
  tokenContractAddress: string;
  page: PageRequest;
}

/**
 * Returns a page of members of an Aragon TokenVoting plugin, scoped
 * to a specific ERC20Votes token contract and ordered by current
 * voting power descending.
 */
export class GetTokenVotingMembershipUseCase
  implements
    UseCase<GetTokenVotingMembershipUseCaseProps, Page<TokenVotingMember>>
{
  public readonly code = 'GetTokenVotingMembershipUseCase';

  constructor(private readonly memberStore: MemberStore) {}

  public async execute(
    props: GetTokenVotingMembershipUseCaseProps,
  ): Promise<Page<TokenVotingMember>> {
    try {
      return await this.memberStore.findTokenVotingMembers(
        props.pluginAddress,
        props.tokenContractAddress,
        props.page,
      );
    } catch (cause) {
      throw new Error('Error while getting token-voting membership', {
        cause,
      });
    }
  }
}
