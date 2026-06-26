import type { MemberStore } from '@/domain/member/MemberStore';
import type { TokenVotingMemberRecord } from '@/domain/member/TokenVotingMemberRecord';
import type { Address } from '@/domain/primitives';
import type { Page } from '@/domain/primitives/pagination/Page';
import { createPage } from '@/domain/primitives/pagination/Page';
import type { PageRequest } from '@/domain/primitives/pagination/PageRequest';
import type { EnvioClient } from '@/infrastructure/stores/EnvioClient';
import * as TokenVotingMemberMap from './maps/TokenVotingMemberMap';

/**
 * Fetches a page of delegates by token (ordered by VP desc), every
 * delegate's id (for total-count), and the MemberMetrics for the
 * plugin.
 */
const FIND_MEMBERS_QUERY = `
  query FindMembers(
    $tokenContractAddress: String!
    $pluginAddress: String!
    $limit: Int!
    $offset: Int!
  ) {
    ERC20VotesDelegate(
      where: {
        tokenContractAddress: { _eq: $tokenContractAddress }
        votingPower: { _gt: "0" }
      }
      order_by: [{ votingPower: desc }]
      limit: $limit
      offset: $offset
    ) {
      id
      chainId
      tokenContractAddress
      delegateAddress
      votingPower
      delegationCount
      firstVotingPowerChangeTimestamp
      lastVotingPowerChangeTimestamp
    }
    AllERC20VotesDelegate: ERC20VotesDelegate(
      where: {
        tokenContractAddress: { _eq: $tokenContractAddress }
        votingPower: { _gt: "0" }
      }
    ) {
      id
    }
    MemberMetrics(
      where: {
        pluginAddress: { _eq: $pluginAddress }
      }
    ) {
      id
      chainId
      pluginAddress
      memberAddress
      firstActivityTimestamp
      lastActivityTimestamp
    }
  }
`;

export class EnvioMemberStore implements MemberStore {
  constructor(private readonly envio: EnvioClient) {}

  public async findTokenVotingMembers(
    pluginAddress: Address,
    tokenContractAddress: Address,
    request: PageRequest,
  ): Promise<Page<TokenVotingMemberRecord>> {
    try {
      // The indexer stores addresses lowercased; serialize the primitives
      // to lowercase hex for the query variables.
      const pluginAddressLower = pluginAddress.toHexString().toLowerCase();
      const tokenAddressLower = tokenContractAddress
        .toHexString()
        .toLowerCase();

      const rawMembers = await this.envio.query(FIND_MEMBERS_QUERY, {
        tokenContractAddress: tokenAddressLower,
        pluginAddress: pluginAddressLower,
        limit: request.pageSize,
        offset: request.offset,
      });

      const { records, totalRecords } =
        TokenVotingMemberMap.mapDTOToDomain(rawMembers);

      return createPage(records, request.page, request.pageSize, totalRecords);
    } catch (cause) {
      throw new Error('Error querying members from Envio', { cause });
    }
  }
}
