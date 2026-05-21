import type { UseCase } from 'ddd-core-ts';
import { Member } from '@/domain/member/Member';
import type { Page } from '@/domain/primitives/pagination/Page';
import type { PageRequest } from '@/domain/primitives/pagination/PageRequest';
import type { TokenVotingMember } from '@/domain/token-voting-member/TokenVotingMember';
import type { TokenVotingMemberStore } from '@/domain/token-voting-member/TokenVotingMemberStore';

export interface GetERC20MembershipUseCaseProps {
  pluginAddress: string;
  tokenContractAddress: string;
  page: PageRequest;
}

/**
 * Returns a page of members of an Aragon TokenVoting plugin, scoped
 * to a specific ERC20Votes token contract and ordered by current
 * voting power descending.
 */
export class GetERC20MembershipUseCase
  implements UseCase<GetERC20MembershipUseCaseProps, Page<Member>>
{
  public readonly code = 'GetERC20MembershipUseCase';

  constructor(private readonly memberStore: TokenVotingMemberStore) {}

  public async execute(
    props: GetERC20MembershipUseCaseProps,
  ): Promise<Page<Member>> {
    try {
      const membersPage = await this.memberStore.findMembersByPluginAndToken(
        props.pluginAddress,
        props.tokenContractAddress,
        props.page,
      );

      const members = membersPage.items.map((member) => this.toMember(member));

      return { ...membersPage, items: members };
    } catch (cause) {
      throw new Error('Error while getting ERC20 membership', { cause });
    }
  }

  /**
   * Converts a raw indexer member into a Member domain object.
   * ENS identity is already attached by the store via the indexer's
   * ReverseName entity, so no further enrichment is required here.
   */
  private toMember(member: TokenVotingMember): Member {
    return Member.create({
      address: member.address,
      ens: member.ens,
      votingPower: member.votingPower,
      firstActivityTimestamp: member.firstActivityTimestamp,
      lastActivityTimestamp: member.lastActivityTimestamp,
      delegationCount: member.delegationCount,
    });
  }
}
