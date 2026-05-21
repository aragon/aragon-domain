import BigNumber from 'bignumber.js';
import { ValueObject } from 'ddd-core-ts';
import { z } from 'zod';
import { Wei } from '@/domain/primitives';

const VotingPowerPropsSchema = z.object({
  value: z.instanceof(Wei),
});

type VotingPowerProps = z.infer<typeof VotingPowerPropsSchema>;

export class VotingPower extends ValueObject<VotingPowerProps> {
  /**
   * The voting power in wei.
   */
  get value(): Wei {
    return this.props.value;
  }

  /**
   * Whether this voting power is zero.
   */
  get isZero(): boolean {
    return this.props.value.toBigNumber().isZero();
  }

  /**
   * Structural equality based on the underlying wei value.
   */
  equals(other?: VotingPower): boolean {
    if (!other) {
      return false;
    }
    return this.props.value.toBigNumber().isEqualTo(other.value.toBigNumber());
  }

  /**
   * Compares this voting power to another.
   * Returns true if this voting power is greater than or equal to the other.
   */
  isGreaterThanOrEqual(other: VotingPower): boolean {
    return this.props.value
      .toBigNumber()
      .isGreaterThanOrEqualTo(other.value.toBigNumber());
  }

  static create(value: Wei): VotingPower {
    const validated = VotingPowerPropsSchema.parse({ value });
    return new VotingPower(validated);
  }

  /**
   * Creates a VotingPower from a bigint value in wei.
   */
  static fromBigInt(wei: bigint): VotingPower {
    return VotingPower.create(Wei.create(new BigNumber(wei.toString())));
  }

  /**
   * Creates a zero voting power.
   */
  static zero(): VotingPower {
    return VotingPower.create(Wei.create(new BigNumber(0)));
  }
}
