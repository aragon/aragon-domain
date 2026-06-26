import type { TokenVotingMember } from '@/domain/member/TokenVotingMember';
import { Address, assertHexString } from '@/domain/primitives';
import type { Page } from '@/domain/primitives/pagination/Page';
import { PageRequest } from '@/domain/primitives/pagination/PageRequest';
import type { GetTokenVotingMembershipUseCaseProps } from '@/use-cases/GetTokenVotingMembershipUseCase';
import type { PageDTO } from '../domain/PageDTO';
import type { TokenVotingMemberDTO } from '../domain/TokenVotingMemberMap';
import * as TokenVotingMemberMap from '../domain/TokenVotingMemberMap';

export interface GetTokenVotingMembershipRequestDTO {
  pluginAddress: string;
  tokenContractAddress: string;
  page?: number;
  pageSize?: number;
}

export function mapDTOToDomain(
  dto: GetTokenVotingMembershipRequestDTO,
): GetTokenVotingMembershipUseCaseProps {
  assertHexString(
    dto.pluginAddress,
    'Expected plugin address to be a hex string',
  );
  assertHexString(
    dto.tokenContractAddress,
    'Expected token contract address to be a hex string',
  );
  return {
    pluginAddress: Address.fromHexString(dto.pluginAddress),
    tokenContractAddress: Address.fromHexString(dto.tokenContractAddress),
    page: PageRequest.create({
      page: dto.page ?? 1,
      pageSize: dto.pageSize ?? 20,
    }),
  };
}

export function mapDomainToDTO(
  result: Page<TokenVotingMember>,
): PageDTO<TokenVotingMemberDTO> {
  return {
    metadata: {
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      totalRecords: result.totalRecords,
    },
    data: result.items.map(TokenVotingMemberMap.mapDomainToDTO),
  };
}
