import { ENSName } from '@/domain/ens/ENSName';
import { TokenVotingMember } from '@/domain/member/TokenVotingMember';
import { Address } from '@/domain/primitives';
import { VotingPower } from '@/domain/voting-power/VotingPower';
import { mapDomainToDTO } from './TokenVotingMemberMap';

describe('TokenVotingMemberMap.mapDomainToDTO', () => {
  const address = Address.fromHexString(
    '0x0123456789abcdef0123456789abcdef01234567',
  );

  const buildMember = (
    overrides: Partial<Parameters<typeof TokenVotingMember.create>[0]> = {},
  ) =>
    TokenVotingMember.create({
      address,
      ens: ENSName.fromString('alice.eth'),
      votingPower: VotingPower.fromBigInt(5000000000000000000n),
      firstActivityTimestamp: 1705320000,
      lastActivityTimestamp: 1718872200,
      delegationCount: 3,
      ...overrides,
    });

  it('maps a Member with full activity to a DTO', () => {
    const dto = mapDomainToDTO(buildMember());

    expect(dto.ens).toBe('alice.eth');
    expect(dto.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(dto.votingPower).toBe('5000000000000000000');
    expect(dto.metrics).toEqual({
      firstActivityTimestamp: 1705320000,
      lastActivityTimestamp: 1718872200,
      delegationCount: 3,
    });
  });

  it('serializes zero activity timestamps as null (no recorded activity)', () => {
    const dto = mapDomainToDTO(
      buildMember({ firstActivityTimestamp: 0, lastActivityTimestamp: 0 }),
    );

    expect(dto.metrics.firstActivityTimestamp).toBeNull();
    expect(dto.metrics.lastActivityTimestamp).toBeNull();
  });
});
