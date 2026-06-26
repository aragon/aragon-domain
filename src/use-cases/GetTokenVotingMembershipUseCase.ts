import type { UseCase } from 'ddd-core-ts';
import type { ENSStore } from '@/domain/ens/ENSStore';
import type { MemberStore } from '@/domain/member/MemberStore';
import { TokenVotingMember } from '@/domain/member/TokenVotingMember';
import type { Address } from '@/domain/primitives';
import type { Page } from '@/domain/primitives/pagination/Page';
import { createPage } from '@/domain/primitives/pagination/Page';
import type { PageRequest } from '@/domain/primitives/pagination/PageRequest';

export interface GetTokenVotingMembershipUseCaseProps {
  pluginAddress: Address;
  tokenContractAddress: Address;
  page: PageRequest;
}

/**
 * Returns a page of members of an Aragon TokenVoting plugin, scoped
 * to a specific token contract and ordered by current voting power
 * descending.
 */
export class GetTokenVotingMembershipUseCase
  implements
    UseCase<GetTokenVotingMembershipUseCaseProps, Page<TokenVotingMember>>
{
  public readonly code = 'GetTokenVotingMembershipUseCase';

  constructor(
    private readonly memberStore: MemberStore,
    private readonly ensStore: ENSStore,
  ) {}

  public async execute(
    props: GetTokenVotingMembershipUseCaseProps,
  ): Promise<Page<TokenVotingMember>> {
    try {
      const records = await this.memberStore.findTokenVotingMembers(
        props.pluginAddress,
        props.tokenContractAddress,
        props.page,
      );

      const namesByAddress = await this.ensStore.lookUpPrimaryNames(
        records.items.map((record) => record.address),
      );

      const members = records.items.map((record) =>
        TokenVotingMember.fromRecord(
          record,
          // ENSStore keys its map by checksummed hex address.
          namesByAddress.get(record.address.toHexString()) ?? null,
        ),
      );

      return createPage(
        members,
        records.page,
        records.pageSize,
        records.totalRecords,
      );
    } catch (cause) {
      throw new Error('Error while getting token-voting membership', {
        cause,
      });
    }
  }
}
