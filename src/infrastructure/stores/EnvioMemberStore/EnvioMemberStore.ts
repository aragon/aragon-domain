import type { MemberGovernanceActivity } from '@/domain/member/MemberGovernanceActivity';
import type {
  FindTokenVotingMembersQuery,
  MemberStore,
  TokenVotingMemberData,
} from '@/domain/member/MemberStore';
import type { TokenVotingMemberRecord } from '@/domain/member/TokenVotingMemberRecord';
import type { Address } from '@/domain/primitives';
import type { Page } from '@/domain/primitives/pagination/Page';
import { createPage } from '@/domain/primitives/pagination/Page';
import type { EnvioClient } from '@/infrastructure/stores/EnvioClient';
import * as MemberGovernanceActivityMap from './maps/MemberGovernanceActivityMap';
import * as TokenVotingMemberRecordMap from './maps/TokenVotingMemberRecordMap';

/**
 * Fetches a page of a token's delegates on a chain, ordered by voting
 * power descending with the delegate address as a stable tiebreaker so
 * equal voting power cannot shuffle members between offset pages.
 *
 * Only delegates holding voting power count as members, for both the page
 * and the total. The indexer also keeps zero-power rows — a delegate whose
 * delegators hold no balance yet, or whose power has since moved away —
 * and those are not accounts that can vote. The legacy backend draws the
 * same line (`votingPower != 0`) for its token member list and count.
 *
 * The total is derived from the id-only `AllERC20VotesDelegate` list
 * because the Envio hosted service does not expose Hasura aggregate
 * (`_aggregate`) queries. A write-time counter maintained by the indexer
 * would remove this fan-out.
 */
const FIND_DELEGATES_QUERY = `
  query FindDelegates(
    $chainId: Int!
    $tokenContractAddress: String!
    $limit: Int!
    $offset: Int!
  ) {
    ERC20VotesDelegate(
      where: {
        chainId: { _eq: $chainId }
        tokenContractAddress: { _eq: $tokenContractAddress }
        votingPower: { _gt: "0" }
      }
      order_by: [{ votingPower: desc }, { delegateAddress: asc }]
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
        chainId: { _eq: $chainId }
        tokenContractAddress: { _eq: $tokenContractAddress }
        votingPower: { _gt: "0" }
      }
    ) {
      id
    }
  }
`;

/**
 * Fetches the governance metrics of the given members within a plugin.
 * Scoped to the page's member addresses so the payload stays page-sized.
 */
const FIND_MEMBER_GOVERNANCE_METRICS_QUERY = `
  query FindMemberGovernanceMetrics(
    $chainId: Int!
    $pluginAddress: String!
    $memberAddresses: [String!]!
  ) {
    MemberGovernanceMetrics(
      where: {
        chainId: { _eq: $chainId }
        pluginAddress: { _eq: $pluginAddress }
        memberAddress: { _in: $memberAddresses }
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

/**
 * The indexer stores addresses lowercased; serialize the primitive to
 * lowercase hex so filters and lookups match its rows.
 */
const toIndexerAddress = (address: Address): string =>
  address.toHexString().toLowerCase();

export class EnvioMemberStore implements MemberStore {
  constructor(private readonly envio: EnvioClient) {}

  public async findTokenVotingMembers(
    query: FindTokenVotingMembersQuery,
  ): Promise<Page<TokenVotingMemberData>> {
    try {
      const chainId = query.chainId.toNumber();
      const pluginAddress = toIndexerAddress(query.pluginAddress);
      const tokenContractAddress = toIndexerAddress(query.tokenContractAddress);

      const rawDelegates = await this.envio.query(FIND_DELEGATES_QUERY, {
        chainId,
        tokenContractAddress,
        limit: query.page.pageSize,
        offset: query.page.offset,
      });
      const { records, totalRecords } =
        TokenVotingMemberRecordMap.mapDTOToDomain(rawDelegates);

      const activityByMember = await this.findActivityByMember(
        chainId,
        pluginAddress,
        records,
      );

      // Pair each on-chain record with its governance activity; ENS is
      // resolved in the use case.
      const data = records.map<TokenVotingMemberData>((record) => ({
        record,
        activity:
          activityByMember.get(toIndexerAddress(record.address)) ?? null,
      }));

      return createPage(
        data,
        query.page.page,
        query.page.pageSize,
        totalRecords,
      );
    } catch (cause) {
      throw new Error('Error querying members from Envio', { cause });
    }
  }

  /**
   * Looks up the governance activity of the page's members, keyed by
   * lowercase address. Skips the round-trip for an empty page.
   */
  private async findActivityByMember(
    chainId: number,
    pluginAddress: string,
    records: TokenVotingMemberRecord[],
  ): Promise<Map<string, MemberGovernanceActivity>> {
    if (records.length === 0) {
      return new Map();
    }

    const raw = await this.envio.query(FIND_MEMBER_GOVERNANCE_METRICS_QUERY, {
      chainId,
      pluginAddress,
      memberAddresses: records.map((record) =>
        toIndexerAddress(record.address),
      ),
    });
    const activity = MemberGovernanceActivityMap.mapDTOToDomain(raw);

    return new Map(
      activity.map((entry) => [toIndexerAddress(entry.memberAddress), entry]),
    );
  }
}
