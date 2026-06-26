import { Address } from '@/domain/primitives';
import { MemberGovernanceMetrics } from './MemberGovernanceMetrics';

describe('MemberGovernanceMetrics', () => {
  const memberAddress = Address.fromHexString(
    '0x0123456789abcdef0123456789abcdef01234567',
  );

  it('exposes its properties', () => {
    const metrics = MemberGovernanceMetrics.create({
      memberAddress,
      firstActivityTimestamp: 1650000000,
      lastActivityTimestamp: 1750000000,
    });

    expect(metrics.memberAddress.equals(memberAddress)).toBe(true);
    expect(metrics.firstActivityTimestamp).toBe(1650000000);
    expect(metrics.lastActivityTimestamp).toBe(1750000000);
  });

  it('rejects a negative timestamp', () => {
    expect(() =>
      MemberGovernanceMetrics.create({
        memberAddress,
        firstActivityTimestamp: -1,
        lastActivityTimestamp: 1750000000,
      }),
    ).toThrow();
  });
});
