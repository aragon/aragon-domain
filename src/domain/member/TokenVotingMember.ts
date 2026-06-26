import { ValueObject } from 'ddd-core-ts';
import { z } from 'zod';
import { ENSName } from '@/domain/ens/ENSName';
import type { Address } from '@/domain/primitives';
import type { VotingPower } from '@/domain/voting-power/VotingPower';
import { MemberGovernanceMetrics } from './MemberGovernanceMetrics';
import { TokenVotingMemberRecord } from './TokenVotingMemberRecord';

const TokenVotingMemberPropsSchema = z.object({
  record: z.instanceof(TokenVotingMemberRecord),
  metrics: z.instanceof(MemberGovernanceMetrics).nullable(),
  ens: z.instanceof(ENSName).nullable(),
});

type TokenVotingMemberProps = z.infer<typeof TokenVotingMemberPropsSchema>;

/**
 * A member of a TokenVoting plugin.
 */
export class TokenVotingMember extends ValueObject<TokenVotingMemberProps> {
  /**
   * The member's wallet address.
   */
  get address(): Address {
    return this.props.record.address;
  }

  /**
   * The member's primary ENS name, or null when the address has no
   * primary name (or it could not be resolved).
   */
  get ens(): ENSName | null {
    return this.props.ens;
  }

  /**
   * The member's voting power.
   */
  get votingPower(): VotingPower {
    return this.props.record.votingPower;
  }

  /**
   * Number of distinct accounts currently delegating their voting power
   * to this member (counts self-delegation).
   */
  get delegationCount(): number {
    return this.props.record.delegationCount;
  }

  /**
   * Unix-seconds timestamp of the member's first observed activity.
   * "Activity" includes voting power changes, votes cast, and proposals
   * created. `0` means "no activity recorded".
   */
  get firstActivityTimestamp(): number {
    return earliest([
      this.props.metrics?.firstActivityTimestamp,
      this.props.record.firstVotingPowerChangeTimestamp,
    ]);
  }

  /**
   * Unix-seconds timestamp of the member's most recent observed activity.
   * "Activity" includes voting power changes, votes cast, and proposals
   * created. `0` means "no activity recorded".
   */
  get lastActivityTimestamp(): number {
    return latest([
      this.props.metrics?.lastActivityTimestamp,
      this.props.record.lastVotingPowerChangeTimestamp,
    ]);
  }

  static create(
    record: TokenVotingMemberRecord,
    metrics: MemberGovernanceMetrics | null,
    ens: ENSName | null,
  ): TokenVotingMember {
    const validated = TokenVotingMemberPropsSchema.parse({
      record,
      metrics,
      ens,
    });
    return new TokenVotingMember(validated);
  }
}

/**
 * Earliest of the defined unix-seconds signals; `0` when none is present.
 */
function earliest(signals: Array<number | null | undefined>): number {
  const defined = signals.filter((signal): signal is number => signal != null);
  return defined.length > 0 ? Math.min(...defined) : 0;
}

/**
 * Latest of the defined unix-seconds signals; `0` when none is present.
 */
function latest(signals: Array<number | null | undefined>): number {
  const defined = signals.filter((signal): signal is number => signal != null);
  return defined.length > 0 ? Math.max(...defined) : 0;
}
