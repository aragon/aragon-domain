import { ValueObject } from 'ddd-core-ts';
import { z } from 'zod';
import { Address } from '@/domain/primitives';
import { VotingPower } from '@/domain/voting-power/VotingPower';

const TokenVotingMemberRecordPropsSchema = z.object({
  address: z.instanceof(Address),
  votingPower: z.instanceof(VotingPower),
  firstActivityTimestamp: z.number().int().nonnegative(),
  lastActivityTimestamp: z.number().int().nonnegative(),
  delegationCount: z.number().int().nonnegative(),
});

type TokenVotingMemberRecordProps = z.infer<
  typeof TokenVotingMemberRecordPropsSchema
>;

/**
 * A TokenVoting member as derived purely from on-chain state.
 */
export class TokenVotingMemberRecord extends ValueObject<TokenVotingMemberRecordProps> {
  /**
   * The member's wallet address.
   */
  get address(): Address {
    return this.props.address;
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

  static create(props: TokenVotingMemberRecordProps): TokenVotingMemberRecord {
    const validated = TokenVotingMemberRecordPropsSchema.parse(props);
    return new TokenVotingMemberRecord(validated);
  }
}
