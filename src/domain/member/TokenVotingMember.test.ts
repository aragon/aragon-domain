import { ENSName } from '@/domain/ens/ENSName';
import { Address } from '@/domain/primitives';
import { VotingPower } from '@/domain/voting-power/VotingPower';
import { MemberGovernanceMetrics } from './MemberGovernanceMetrics';
import { TokenVotingMember } from './TokenVotingMember';
import { TokenVotingMemberRecord } from './TokenVotingMemberRecord';

describe('TokenVotingMember', () => {
  const address = Address.fromHexString(
    '0x0123456789abcdef0123456789abcdef01234567',
  );

  const buildRecord = (
    overrides: Partial<
      Parameters<typeof TokenVotingMemberRecord.create>[0]
    > = {},
  ) =>
    TokenVotingMemberRecord.create({
      address,
      votingPower: VotingPower.fromBigInt(1000000000000000000n),
      delegationCount: 3,
      firstVotingPowerChangeTimestamp: 1700000000,
      lastVotingPowerChangeTimestamp: 1700000100,
      ...overrides,
    });

  const buildMetrics = (
    overrides: Partial<
      Parameters<typeof MemberGovernanceMetrics.create>[0]
    > = {},
  ) =>
    MemberGovernanceMetrics.create({
      memberAddress: address,
      firstActivityTimestamp: 1650000000,
      lastActivityTimestamp: 1750000000,
      ...overrides,
    });

  describe('getters delegate to the source objects', () => {
    it('pulls identity, voting power, and delegation count from the record', () => {
      const member = TokenVotingMember.create(buildRecord(), null, null);
      expect(member.address.equals(address)).toBe(true);
      expect(member.votingPower.isZero).toBe(false);
      expect(member.delegationCount).toBe(3);
    });

    it('pulls the ENS name from the composed name', () => {
      const named = TokenVotingMember.create(
        buildRecord(),
        null,
        ENSName.fromString('alice.eth'),
      );
      expect(named.ens?.toString()).toBe('alice.eth');

      const anonymous = TokenVotingMember.create(buildRecord(), null, null);
      expect(anonymous.ens).toBeNull();
    });
  });

  describe('activity window is derived in the getters', () => {
    it('spans the earliest/latest across governance metrics and VP changes', () => {
      const member = TokenVotingMember.create(
        buildRecord(),
        buildMetrics(),
        null,
      );
      // earliest first: metrics 1650000000 < record 1700000000
      expect(member.firstActivityTimestamp).toBe(1650000000);
      // latest last: metrics 1750000000 > record 1700000100
      expect(member.lastActivityTimestamp).toBe(1750000000);
    });

    it('uses the VP-change window when there are no governance metrics', () => {
      const member = TokenVotingMember.create(buildRecord(), null, null);
      expect(member.firstActivityTimestamp).toBe(1700000000);
      expect(member.lastActivityTimestamp).toBe(1700000100);
    });

    it('uses the governance window when the record has no VP changes', () => {
      const member = TokenVotingMember.create(
        buildRecord({
          firstVotingPowerChangeTimestamp: null,
          lastVotingPowerChangeTimestamp: null,
        }),
        buildMetrics(),
        null,
      );
      expect(member.firstActivityTimestamp).toBe(1650000000);
      expect(member.lastActivityTimestamp).toBe(1750000000);
    });

    it('reports 0 timestamps when no activity signal is present', () => {
      const member = TokenVotingMember.create(
        buildRecord({
          firstVotingPowerChangeTimestamp: null,
          lastVotingPowerChangeTimestamp: null,
        }),
        null,
        null,
      );
      expect(member.firstActivityTimestamp).toBe(0);
      expect(member.lastActivityTimestamp).toBe(0);
    });
  });

  describe('equals', () => {
    it('is structural over the composed objects', () => {
      const record = buildRecord();
      const metrics = buildMetrics();
      const a = TokenVotingMember.create(record, metrics, null);
      const b = TokenVotingMember.create(record, metrics, null);
      expect(a.equals(b)).toBe(true);
    });

    it('differs when the composed record differs', () => {
      const metrics = buildMetrics();
      const a = TokenVotingMember.create(buildRecord(), metrics, null);
      const b = TokenVotingMember.create(
        buildRecord({ votingPower: VotingPower.zero() }),
        metrics,
        null,
      );
      expect(a.equals(b)).toBe(false);
    });
  });
});
