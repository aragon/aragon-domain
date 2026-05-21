import { Address } from '@/domain/primitives';
import { VotingPower } from '@/domain/voting-power/VotingPower';
import { TokenVotingMember } from './TokenVotingMember';

describe('TokenVotingMember', () => {
  const address = Address.fromHexString(
    '0x0123456789abcdef0123456789abcdef01234567',
  );
  const pluginAddress = Address.fromHexString(
    '0x1111111111111111111111111111111111111111',
  );
  const tokenContractAddress = Address.fromHexString(
    '0xabcdef0123456789abcdef0123456789abcdef01',
  );
  const votingPower = VotingPower.fromBigInt(1000000000000000000n);
  const firstActivityTimestamp = 1705320000;
  const lastActivityTimestamp = 1718872200;

  const validProps = {
    address,
    pluginAddress,
    tokenContractAddress,
    votingPower,
    ens: null,
    firstActivityTimestamp,
    lastActivityTimestamp,
    delegationCount: 7,
  };

  it('creates a valid member', () => {
    const member = TokenVotingMember.create(validProps);

    expect(member.address.equals(address)).toBe(true);
    expect(member.pluginAddress.equals(pluginAddress)).toBe(true);
    expect(member.tokenContractAddress.equals(tokenContractAddress)).toBe(true);
    expect(member.votingPower.equals(votingPower)).toBe(true);
    expect(member.ens).toBeNull();
    expect(member.firstActivityTimestamp).toBe(firstActivityTimestamp);
    expect(member.lastActivityTimestamp).toBe(lastActivityTimestamp);
  });

  it('carries an ENS name when present', () => {
    const member = TokenVotingMember.create({
      ...validProps,
      ens: 'alice.eth',
    });
    expect(member.ens).toBe('alice.eth');
  });

  it('structural equality', () => {
    const a = TokenVotingMember.create(validProps);
    const b = TokenVotingMember.create(validProps);
    expect(a.equals(b)).toBe(true);
  });
});
