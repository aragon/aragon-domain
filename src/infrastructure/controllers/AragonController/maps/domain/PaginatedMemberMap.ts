import type { Member } from '@/domain/member/Member';
import type { Page } from '@/domain/primitives/pagination/Page';
import type { MemberDTO } from './MemberMap';
import * as MemberMap from './MemberMap';

export interface PaginatedMemberDTO {
  metadata: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
  };
  data: MemberDTO[];
}

export function mapDomainToDTO(result: Page<Member>): PaginatedMemberDTO {
  return {
    metadata: {
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      totalRecords: result.totalRecords,
    },
    data: result.items.map(MemberMap.mapDomainToDTO),
  };
}
