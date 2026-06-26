import { VotingPower } from './VotingPower';

describe('VotingPower', () => {
  it('creates from bigint', () => {
    const vp = VotingPower.fromBigInt(1000000000000000000n);
    expect(vp.value.toBigNumber().toString()).toBe('1000000000000000000');
  });

  it('creates zero', () => {
    const vp = VotingPower.zero();
    expect(vp.isZero).toBe(true);
  });

  it('detects non-zero', () => {
    const vp = VotingPower.fromBigInt(1n);
    expect(vp.isZero).toBe(false);
  });

  it('compares greater than or equal', () => {
    const high = VotingPower.fromBigInt(100n);
    const low = VotingPower.fromBigInt(50n);
    const equal = VotingPower.fromBigInt(100n);

    expect(high.isGreaterThanOrEqual(low)).toBe(true);
    expect(high.isGreaterThanOrEqual(equal)).toBe(true);
    expect(low.isGreaterThanOrEqual(high)).toBe(false);
  });

  it('structural equality', () => {
    const a = VotingPower.fromBigInt(100n);
    const b = VotingPower.fromBigInt(100n);
    expect(a.equals(b)).toBe(true);
  });

  it('structural inequality', () => {
    const a = VotingPower.fromBigInt(100n);
    const b = VotingPower.fromBigInt(200n);
    expect(a.equals(b)).toBe(false);
  });

  it('equals(undefined) returns false', () => {
    const vp = VotingPower.fromBigInt(100n);
    expect(vp.equals(undefined)).toBe(false);
  });

  it('converts to ether', () => {
    const vp = VotingPower.fromBigInt(1230000000000000000n);
    expect(vp.value.toEther().toBigNumber().toNumber()).toBeCloseTo(1.23);
  });
});
