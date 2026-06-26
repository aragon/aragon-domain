import type {
  MemberStore,
  TokenVotingMemberData,
} from '@/domain/member/MemberStore';
import type { Address } from '@/domain/primitives';
import type { Page } from '@/domain/primitives/pagination/Page';
import { createPage } from '@/domain/primitives/pagination/Page';
import type { PageRequest } from '@/domain/primitives/pagination/PageRequest';
import type { EnvioClient } from '@/infrastructure/stores/EnvioClient';
import * as MemberGovernanceMetricsMap from './maps/MemberGovernanceMetricsMap';
import * as TokenVotingMemberRecordMap from './maps/TokenVotingMemberRecordMap';

/**
 * Fetches a page of members by token (ordered by VP desc).
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
    MemberGovernanceMetrics(
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
  ): Promise<Page<TokenVotingMemberData>> {
    try {
      // The indexer stores addresses lowercased; serialize the primitives
      // to lowercase hex for the query variables.
      const pluginAddressLower = pluginAddress.toHexString().toLowerCase();
      const tokenAddressLower = tokenContractAddress
        .toHexString()
        .toLowerCase();

      const raw = await this.envio.query(FIND_MEMBERS_QUERY, {
        tokenContractAddress: tokenAddressLower,
        pluginAddress: pluginAddressLower,
        limit: request.pageSize,
        offset: request.offset,
      });

      const { records, totalRecords } =
        TokenVotingMemberRecordMap.mapDTOToDomain(raw);
      const metrics = MemberGovernanceMetricsMap.mapDTOToDomain(raw);

      const metricsByMember = new Map(
        metrics.map((entry) => [
          entry.memberAddress.toHexString().toLowerCase(),
          entry,
        ]),
      );

      // Pair each on-chain record with its governance metrics (one query,
      // so the join happens here); ENS is resolved in the use case.
      const data = records.map<TokenVotingMemberData>((record) => ({
        record,
        metrics:
          metricsByMember.get(record.address.toHexString().toLowerCase()) ??
          null,
      }));

      return createPage(data, request.page, request.pageSize, totalRecords);
    } catch (cause) {
      throw new Error('Error querying members from Envio', { cause });
    }
  }
}
