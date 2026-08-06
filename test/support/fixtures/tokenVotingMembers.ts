import { TOKEN } from '../constants';

/**
 * Canned Envio responses for the `getTokenVotingMembership` flow.
 */

export interface DelegateOverrides {
  votingPower?: string;
  delegationCount?: number;
  firstVotingPowerChangeTimestamp?: string;
  lastVotingPowerChangeTimestamp?: string;
}

/** A single `ERC20VotesDelegate` row as the indexer returns it. */
export function delegate(address: string, overrides: DelegateOverrides = {}) {
  return {
    id: `1-${TOKEN}-${address}`,
    chainId: 1,
    tokenContractAddress: TOKEN,
    delegateAddress: address,
    votingPower: overrides.votingPower ?? '5000000000000000000',
    delegationCount: overrides.delegationCount ?? 1,
    firstVotingPowerChangeTimestamp:
      overrides.firstVotingPowerChangeTimestamp ?? '1700000000',
    lastVotingPowerChangeTimestamp:
      overrides.lastVotingPowerChangeTimestamp ?? '1700000100',
  };
}

export interface FindMembersResponseInput {
  delegates?: ReturnType<typeof delegate>[];
  metrics?: unknown[];
  /**
   * The chain-wide total used for pagination. Defaults to the number
   * of `delegates` on this page; override to simulate more pages.
   */
  totalRecords?: number;
}

/**
 * The members query response: the page of delegates, the id-only
 * set used for total-count, and the plugin's MemberGovernanceMetrics.
 */
export function findMembersResponse({
  delegates = [],
  metrics = [],
  totalRecords,
}: FindMembersResponseInput = {}) {
  const total = totalRecords ?? delegates.length;
  return {
    ERC20VotesDelegate: delegates,
    AllERC20VotesDelegate: Array.from({ length: total }, (_, i) => ({
      id: `total-${i}`,
    })),
    MemberGovernanceMetrics: metrics,
  };
}
