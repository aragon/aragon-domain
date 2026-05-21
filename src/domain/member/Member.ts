import { ValueObject } from 'ddd-core-ts';
import { z } from 'zod';
import { Address } from '@/domain/primitives';
import { VotingPower } from '@/domain/voting-power/VotingPower';

const MemberPropsSchema = z.object({
  address: z.instanceof(Address),
  ens: z.string().nullable(),
  votingPower: z.instanceof(VotingPower),
  firstActivityTimestamp: z.number().int().nonnegative(),
  lastActivityTimestamp: z.number().int().nonnegative(),
  delegationCount: z.number().int().nonnegative(),
});

type MemberProps = z.infer<typeof MemberPropsSchema>;

export class Member extends ValueObject<MemberProps> {
  /**
   * The member's wallet address.
   */
  get address(): Address {
    return this.props.address;
  }

  /**
   * The member's ENS name, or null if not resolved.
   */
  get ens(): string | null {
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

  static create(props: MemberProps): Member {
    const validated = MemberPropsSchema.parse(props);
    return new Member(validated);
  }
}
