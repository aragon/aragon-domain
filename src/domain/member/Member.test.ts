import { Address } from '@/domain/primitives';
import { VotingPower } from '@/domain/voting-power/VotingPower';
import { Member } from './Member';

describe('Member', () => {
  const address = Address.fromHexString(
    '0x0123456789abcdef0123456789abcdef01234567',
  );
  const firstActivityTimestamp = 1705320000;
  const lastActivityTimestamp = 1718872200;

  const validProps = {
    address,
    ens: 'alice.eth',
    votingPower: VotingPower.fromBigInt(1000000000000000000n),
    firstActivityTimestamp,
    lastActivityTimestamp,
    delegationCount: 3,
  };

  it('creates a valid member', () => {
    const member = Member.create(validProps);
    expect(member.address.equals(address)).toBe(true);
    expect(member.ens).toBe('alice.eth');
    expect(member.votingPower.isZero).toBe(false);
    expect(member.firstActivityTimestamp).toBe(firstActivityTimestamp);
    expect(member.lastActivityTimestamp).toBe(lastActivityTimestamp);
  });

  it('allows null ens', () => {
    const member = Member.create({ ...validProps, ens: null });
    expect(member.ens).toBeNull();
  });

  it('structural equality', () => {
    const a = Member.create(validProps);
    const b = Member.create(validProps);
    expect(a.equals(b)).toBe(true);
  });

  it('structural inequality when votingPower differs', () => {
    const a = Member.create(validProps);
    const b = Member.create({
      ...validProps,
      votingPower: VotingPower.zero(),
    });
    expect(a.equals(b)).toBe(false);
  });
});
