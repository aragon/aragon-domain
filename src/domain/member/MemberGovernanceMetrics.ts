import { ValueObject } from 'ddd-core-ts';
import { z } from 'zod';
import { Address } from '@/domain/primitives';

const MemberGovernanceMetricsPropsSchema = z.object({
  memberAddress: z.instanceof(Address),
  firstActivityTimestamp: z.number().int().nonnegative(),
  lastActivityTimestamp: z.number().int().nonnegative(),
});

type MemberGovernanceMetricsProps = z.infer<
  typeof MemberGovernanceMetricsPropsSchema
>;

/**
 * A member's governance activity (votes cast or proposals created) within a
 * plugin.
 */
export class MemberGovernanceMetrics extends ValueObject<MemberGovernanceMetricsProps> {
  /**
   * The member's account address.
   */
  get memberAddress(): Address {
    return this.props.memberAddress;
  }

  /**
   * Unix-seconds timestamp of the member's first governance action.
   */
  get firstActivityTimestamp(): number {
    return this.props.firstActivityTimestamp;
  }

  /**
   * Unix-seconds timestamp of the member's most recent governance action.
   */
  get lastActivityTimestamp(): number {
    return this.props.lastActivityTimestamp;
  }

  static create(props: MemberGovernanceMetricsProps): MemberGovernanceMetrics {
    const validated = MemberGovernanceMetricsPropsSchema.parse(props);
    return new MemberGovernanceMetrics(validated);
  }
}
