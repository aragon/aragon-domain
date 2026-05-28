import type { HandlerDefinition } from 'ddd-core-ts';
import { handleRequest } from 'ddd-core-ts';
import type { Member } from '@/domain/member/Member';
import type { MemberProfileTextRecord } from '@/domain/member-profile/MemberProfileTextRecord';
import type { Page } from '@/domain/primitives/pagination/Page';
import type { EnvioClient } from '@/infrastructure/stores/EnvioClient';
import { EnvioMemberProfileStore } from '@/infrastructure/stores/EnvioMemberProfileStore/EnvioMemberProfileStore';
import { EnvioTokenVotingMemberStore } from '@/infrastructure/stores/EnvioTokenVotingMemberStore/EnvioTokenVotingMemberStore';
import type { GetERC20MembershipUseCaseProps } from '@/use-cases/GetERC20MembershipUseCase';
import { GetERC20MembershipUseCase } from '@/use-cases/GetERC20MembershipUseCase';
import type { GetMemberProfileTextRecordsUseCaseProps } from '@/use-cases/GetMemberProfileTextRecordsUseCase';
import { GetMemberProfileTextRecordsUseCase } from '@/use-cases/GetMemberProfileTextRecordsUseCase';
import type { MemberProfileTextRecordDTO } from './maps/domain/MemberProfileTextRecordMap';
import * as MemberProfileTextRecordMap from './maps/domain/MemberProfileTextRecordMap';
import type { PaginatedMemberDTO } from './maps/domain/PaginatedMemberMap';
import * as PaginatedMemberMap from './maps/domain/PaginatedMemberMap';
import type { GetERC20MembershipRequestDTO } from './maps/use-cases/GetERC20MembershipMap';
import * as GetERC20MembershipMap from './maps/use-cases/GetERC20MembershipMap';
import type { GetMemberProfileTextRecordsRequestDTO } from './maps/use-cases/GetMemberProfileTextRecordsMap';
import * as GetMemberProfileTextRecordsMap from './maps/use-cases/GetMemberProfileTextRecordsMap';

interface HandlersRecord {
  getERC20Membership: HandlerDefinition<
    GetERC20MembershipRequestDTO,
    GetERC20MembershipUseCaseProps,
    Page<Member>,
    PaginatedMemberDTO
  >;
  getMemberProfileTextRecords: HandlerDefinition<
    GetMemberProfileTextRecordsRequestDTO,
    GetMemberProfileTextRecordsUseCaseProps,
    MemberProfileTextRecord[],
    MemberProfileTextRecordDTO[]
  >;
}

/**
 * General domain for all Aragon-related business logic.
 */
export class AragonController {
  private constructor(private readonly handlers: HandlersRecord) {}

  /**
   * Initializes the `AragonSubdomain`.
   */
  static load(envioClient: EnvioClient): AragonController {
    const memberStore = new EnvioTokenVotingMemberStore(envioClient);
    const getERC20MembershipUseCase = new GetERC20MembershipUseCase(
      memberStore,
    );

    const memberProfileStore = new EnvioMemberProfileStore(envioClient);
    const getMemberProfileTextRecordsUseCase =
      new GetMemberProfileTextRecordsUseCase(memberProfileStore);

    const handlers: HandlersRecord = {
      getERC20Membership: {
        requestMapper: GetERC20MembershipMap,
        responseMapper: PaginatedMemberMap,
        useCaseExecutor: getERC20MembershipUseCase,
      },
      getMemberProfileTextRecords: {
        requestMapper: GetMemberProfileTextRecordsMap,
        responseMapper: MemberProfileTextRecordMap,
        useCaseExecutor: getMemberProfileTextRecordsUseCase,
      },
    };

    return new AragonController(handlers);
  }

  /**
   * Returns a page of members of an Aragon TokenVoting plugin, scoped
   * to a specific ERC20Votes token contract and ordered by current
   * voting power descending.
   */
  public getMembership(dto: GetERC20MembershipRequestDTO) {
    return handleRequest(this.handlers.getERC20Membership, dto);
  }

  /**
   * Looks up the live forward ENS text records attached to a member's `.aragon.eth`
   * subdomain. Returns an empty list when the subdomain is unknown, has
   * no resolver, or has no current records.
   */
  public getMemberProfileTextRecords(
    dto: GetMemberProfileTextRecordsRequestDTO,
  ) {
    return handleRequest(this.handlers.getMemberProfileTextRecords, dto);
  }
}
