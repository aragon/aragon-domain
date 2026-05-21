import type { Page } from '@/domain/primitives/pagination/Page';
import { createPage } from '@/domain/primitives/pagination/Page';
import type { PageRequest } from '@/domain/primitives/pagination/PageRequest';
import type { TokenVotingMember } from '@/domain/token-voting-member/TokenVotingMember';
import type { TokenVotingMemberStore } from '@/domain/token-voting-member/TokenVotingMemberStore';
import type { EnvioClient } from '@/infrastructure/stores/EnvioClient';
import * as ReverseNameMap from './maps/ReverseNameMap';
import * as TokenVotingMemberMap from './maps/TokenVotingMemberMap';

/**
 * Fetches a page of delegates by token (ordered by VP desc), every
 * delegate's id (for total-count), and the MemberMetrics for the
 * plugin — all in one round-trip.
 *
 * The query straddles the indexer's generic / Aragon partition:
 *   - ERC20VotesDelegate is generic (per-token, chain-wide)
 *   - MemberMetrics is Aragon-specific (per-plugin)
 *
 * Hasura cannot express a cross-entity join here, so the pairing
 * happens client-side. That client-side merge is also what makes the
 * eventual indexer split a no-op for this file beyond pointing the
 * two halves at separate GraphQL endpoints.
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

/**
 * Fetches every `ReverseName` row that matches the given page of
 * delegate addresses. An address can have up to two rows on mainnet
 * (legacy `coinType=60` and ENSIP-19 `coinType=0x80000000`); we pull
 * both and pick precedence client-side via `ReverseNameMap`.
 *
 * Ordering by `coinType` descending puts `0x80000000` (2147483648)
 * ahead of `60`, so the first row per address in the dedupe pass is
 * the preferred one.
 */
const FIND_REVERSE_NAMES_QUERY = `
  query FindReverseNames($addresses: [String!]!) {
    ReverseName(
      where: { address: { _in: $addresses } }
      order_by: [{ coinType: desc }]
    ) {
      address
      coinType
      name
    }
  }
`;

export class EnvioTokenVotingMemberStore implements TokenVotingMemberStore {
  constructor(private readonly envio: EnvioClient) {}

  public async findMembersByPluginAndToken(
    pluginAddress: string,
    tokenContractAddress: string,
    request: PageRequest,
  ): Promise<Page<TokenVotingMember>> {
    try {
      const pluginAddressLower = pluginAddress.toLowerCase();
      const tokenAddressLower = tokenContractAddress.toLowerCase();

      const rawMembers = await this.envio.query(FIND_MEMBERS_QUERY, {
        tokenContractAddress: tokenAddressLower,
        pluginAddress: pluginAddressLower,
        limit: request.pageSize,
        offset: request.offset,
      });
      const data = TokenVotingMemberMap.parseFindMembersResponse(rawMembers);

      const metricsByMember = new Map(
        data.MemberMetrics.map((m) => [m.memberAddress.toLowerCase(), m]),
      );

      const pageAddresses = data.ERC20VotesDelegate.map((d) =>
        d.delegateAddress.toLowerCase(),
      );
      const ensByAddress = await this.fetchReverseNames(pageAddresses);

      const members = data.ERC20VotesDelegate.map((delegate) => {
        const addressLower = delegate.delegateAddress.toLowerCase();
        return TokenVotingMemberMap.mapDTOToDomain(
          delegate,
          metricsByMember.get(addressLower),
          ensByAddress.get(addressLower) ?? null,
          pluginAddressLower,
        );
      });

      const totalRecords = data.AllERC20VotesDelegate.length;

      return createPage(members, request.page, request.pageSize, totalRecords);
    } catch (cause) {
      throw new Error('Error querying members from Envio', { cause });
    }
  }

  /**
   * Resolves a batch of lowercase addresses to their preferred ENS
   * primary names via the indexer's `ReverseName` entity.
   *
   * Returns an empty map when given no addresses — avoids issuing an
   * empty `_in` query.
   */
  private async fetchReverseNames(
    lowercaseAddresses: string[],
  ): Promise<Map<string, string>> {
    if (lowercaseAddresses.length === 0) {
      return new Map();
    }

    const raw = await this.envio.query(FIND_REVERSE_NAMES_QUERY, {
      addresses: lowercaseAddresses,
    });
    return ReverseNameMap.mapDTOToDomain(raw);
  }
}
