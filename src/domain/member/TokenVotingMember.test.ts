import { ENSName } from '@/domain/ens/ENSName';
import { Address } from '@/domain/primitives';
import { VotingPower } from '@/domain/voting-power/VotingPower';
import { TokenVotingMember } from './TokenVotingMember';
import { TokenVotingMemberRecord } from './TokenVotingMemberRecord';

describe('TokenVotingMember', () => {
  const address = Address.fromHexString(
    '0x0123456789abcdef0123456789abcdef01234567',
  );
  const firstActivityTimestamp = 1705320000;
  const lastActivityTimestamp = 1718872200;

  const validProps = {
    address,
    ens: ENSName.fromString('alice.eth'),
    votingPower: VotingPower.fromBigInt(1000000000000000000n),
    firstActivityTimestamp,
    lastActivityTimestamp,
    delegationCount: 3,
  };

  const buildRecord = () =>
    TokenVotingMemberRecord.create({
      address,
      votingPower: VotingPower.fromBigInt(1000000000000000000n),
      firstActivityTimestamp,
      lastActivityTimestamp,
      delegationCount: 3,
    });

  it('creates a valid member', () => {
    const member = TokenVotingMember.create(validProps);
    expect(member.address.equals(address)).toBe(true);
    expect(member.ens?.toString()).toBe('alice.eth');
    expect(member.votingPower.isZero).toBe(false);
    expect(member.firstActivityTimestamp).toBe(firstActivityTimestamp);
    expect(member.lastActivityTimestamp).toBe(lastActivityTimestamp);
  });

  it('allows null ens', () => {
    const member = TokenVotingMember.create({ ...validProps, ens: null });
    expect(member.ens).toBeNull();
  });

  it('composes a record and a resolved name via fromRecord', () => {
    const member = TokenVotingMember.fromRecord(
      buildRecord(),
      ENSName.fromString('alice.eth'),
    );
    expect(member.address.equals(address)).toBe(true);
    expect(member.ens?.toString()).toBe('alice.eth');
    expect(member.delegationCount).toBe(3);
  });

  it('composes a record with no name (null) via fromRecord', () => {
    const member = TokenVotingMember.fromRecord(buildRecord(), null);
    expect(member.ens).toBeNull();
  });

  it('structural equality', () => {
    const a = TokenVotingMember.create(validProps);
    const b = TokenVotingMember.create(validProps);
    expect(a.equals(b)).toBe(true);
  });

  it('structural inequality when votingPower differs', () => {
    const a = TokenVotingMember.create(validProps);
    const b = TokenVotingMember.create({
      ...validProps,
      votingPower: VotingPower.zero(),
    });
    expect(a.equals(b)).toBe(false);
  });
});
