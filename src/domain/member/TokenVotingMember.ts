import { ValueObject } from 'ddd-core-ts';
import { z } from 'zod';
import { ENSName } from '@/domain/ens/ENSName';
import { Address } from '@/domain/primitives';
import { VotingPower } from '@/domain/voting-power/VotingPower';
import type { TokenVotingMemberRecord } from './TokenVotingMemberRecord';

const TokenVotingMemberPropsSchema = z.object({
  address: z.instanceof(Address),
  ens: z.instanceof(ENSName).nullable(),
  votingPower: z.instanceof(VotingPower),
  firstActivityTimestamp: z.number().int().nonnegative(),
  lastActivityTimestamp: z.number().int().nonnegative(),
  delegationCount: z.number().int().nonnegative(),
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
    return this.props.address;
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
    return this.props.votingPower;
  }

  /**
   * Unix-seconds timestamp of the member's first observed activity.
   */
  get firstActivityTimestamp(): number {
    return this.props.firstActivityTimestamp;
  }

  /**
   * Unix-seconds timestamp of the member's most recent observed activity.
   */
  get lastActivityTimestamp(): number {
    return this.props.lastActivityTimestamp;
  }

  /**
   * Number of distinct accounts currently delegating their voting power
   * to this member (counts self-delegation).
   */
  get delegationCount(): number {
    return this.props.delegationCount;
  }

  static create(props: TokenVotingMemberProps): TokenVotingMember {
    const validated = TokenVotingMemberPropsSchema.parse(props);
    return new TokenVotingMember(validated);
  }

  /**
   * Composes a fully-resolved member from its indexed on-chain record and
   * primary ENS name.
   */
  static fromRecord(
    record: TokenVotingMemberRecord,
    ens: ENSName | null,
  ): TokenVotingMember {
    return TokenVotingMember.create({
      address: record.address,
      ens,
      votingPower: record.votingPower,
      firstActivityTimestamp: record.firstActivityTimestamp,
      lastActivityTimestamp: record.lastActivityTimestamp,
      delegationCount: record.delegationCount,
    });
  }
}
