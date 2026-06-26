import { Address } from '@/domain/primitives';
import { VotingPower } from '@/domain/voting-power/VotingPower';
import { TokenVotingMemberRecord } from './TokenVotingMemberRecord';

describe('TokenVotingMemberRecord', () => {
  const address = Address.fromHexString(
    '0x0123456789abcdef0123456789abcdef01234567',
  );

  const validProps = {
    address,
    votingPower: VotingPower.fromBigInt(1000000000000000000n),
    firstActivityTimestamp: 1705320000,
    lastActivityTimestamp: 1718872200,
    delegationCount: 3,
  };

  it('creates a valid record', () => {
    const record = TokenVotingMemberRecord.create(validProps);
    expect(record.address.equals(address)).toBe(true);
    expect(record.votingPower.isZero).toBe(false);
    expect(record.firstActivityTimestamp).toBe(1705320000);
    expect(record.lastActivityTimestamp).toBe(1718872200);
    expect(record.delegationCount).toBe(3);
  });

  it('rejects a negative delegation count', () => {
    expect(() =>
      TokenVotingMemberRecord.create({ ...validProps, delegationCount: -1 }),
    ).toThrow();
  });
});
