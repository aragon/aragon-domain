import type { HandlerDefinition } from 'ddd-core-ts';
import { handleRequest } from 'ddd-core-ts';
import type { TokenVotingMember } from '@/domain/member/TokenVotingMember';
import type { MemberProfileTextRecord } from '@/domain/member-profile/MemberProfileTextRecord';
import type { Page } from '@/domain/primitives/pagination/Page';
import type { EnvioClient } from '@/infrastructure/stores/EnvioClient';
import { EnvioMemberProfileStore } from '@/infrastructure/stores/EnvioMemberProfileStore/EnvioMemberProfileStore';
import { EnvioMemberStore } from '@/infrastructure/stores/EnvioMemberStore/EnvioMemberStore';
import { GetTokenVotingMembershipUseCase } from '@/use-cases/GetTokenVotingMembershipUseCase';
import type { GetTokenVotingMembershipUseCaseProps } from '@/use-cases/GetTokenVotingMembershipUseCase';
import type { GetMemberProfileTextRecordsUseCaseProps } from '@/use-cases/GetMemberProfileTextRecordsUseCase';
import { GetMemberProfileTextRecordsUseCase } from '@/use-cases/GetMemberProfileTextRecordsUseCase';
import type { MemberProfileTextRecordDTO } from './maps/domain/MemberProfileTextRecordMap';
import * as MemberProfileTextRecordMap from './maps/domain/MemberProfileTextRecordMap';
import type { PageDTO } from './maps/domain/PageDTO';
import type { TokenVotingMemberDTO } from './maps/domain/TokenVotingMemberMap';
import * as GetTokenVotingMembershipMap from './maps/use-cases/GetTokenVotingMembershipMap';
import type { GetTokenVotingMembershipRequestDTO } from './maps/use-cases/GetTokenVotingMembershipMap';
import type { GetMemberProfileTextRecordsRequestDTO } from './maps/use-cases/GetMemberProfileTextRecordsMap';
import * as GetMemberProfileTextRecordsMap from './maps/use-cases/GetMemberProfileTextRecordsMap';

interface HandlersRecord {
  getTokenVotingMembership: HandlerDefinition<
    GetTokenVotingMembershipRequestDTO,
    GetTokenVotingMembershipUseCaseProps,
    Page<TokenVotingMember>,
    PageDTO<TokenVotingMemberDTO>
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
    const memberStore = new EnvioMemberStore(envioClient);
    const getTokenVotingMembershipUseCase = new GetTokenVotingMembershipUseCase(
      memberStore,
    );

    const memberProfileStore = new EnvioMemberProfileStore(envioClient);
    const getMemberProfileTextRecordsUseCase =
      new GetMemberProfileTextRecordsUseCase(memberProfileStore);

    const handlers: HandlersRecord = {
      getTokenVotingMembership: {
        requestMapper: GetTokenVotingMembershipMap,
        responseMapper: GetTokenVotingMembershipMap,
        useCaseExecutor: getTokenVotingMembershipUseCase,
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
  public getTokenVotingMembership(dto: GetTokenVotingMembershipRequestDTO) {
    return handleRequest(this.handlers.getTokenVotingMembership, dto);
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
