import { PageRequest } from '@/domain/primitives/pagination/PageRequest';
import type { GetERC20MembershipUseCaseProps } from '@/use-cases/GetERC20MembershipUseCase';

export interface GetERC20MembershipRequestDTO {
  pluginAddress: string;
  tokenContractAddress: string;
  page?: number;
  pageSize?: number;
}

export function mapDTOToDomain(
  dto: GetERC20MembershipRequestDTO,
): GetERC20MembershipUseCaseProps {
  return {
    pluginAddress: dto.pluginAddress,
    tokenContractAddress: dto.tokenContractAddress,
    page: PageRequest.create({
      page: dto.page ?? 1,
      pageSize: dto.pageSize ?? 20,
    }),
  };
}
