import { TokenVotingMember } from '@/domain/member/TokenVotingMember';
import { Address } from '@/domain/primitives';
import { createPage } from '@/domain/primitives/pagination/Page';
import { VotingPower } from '@/domain/voting-power/VotingPower';
import { mapDomainToDTO, mapDTOToDomain } from './GetTokenVotingMembershipMap';

describe('GetTokenVotingMembershipMap', () => {
  const pluginAddress = '0x1111111111111111111111111111111111111111';
  const tokenContractAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

  describe('mapDTOToDomain', () => {
    it('passes explicit page and pageSize through to the PageRequest', () => {
      const result = mapDTOToDomain({
        pluginAddress,
        tokenContractAddress,
        page: 3,
        pageSize: 50,
      });

      expect(result.page.page).toBe(3);
      expect(result.page.pageSize).toBe(50);
    });

    it('defaults page to 1 and pageSize to 20 when omitted', () => {
      const result = mapDTOToDomain({ pluginAddress, tokenContractAddress });

      expect(result.page.page).toBe(1);
      expect(result.page.pageSize).toBe(20);
    });

    it('forwards plugin and token addresses unchanged', () => {
      const result = mapDTOToDomain({ pluginAddress, tokenContractAddress });

      expect(result.pluginAddress).toBe(pluginAddress);
      expect(result.tokenContractAddress).toBe(tokenContractAddress);
    });
  });

  describe('mapDomainToDTO', () => {
    it('maps a domain page to a PageDTO of TokenVotingMemberDTO', () => {
      const member = TokenVotingMember.create({
        address: Address.fromHexString(
          '0x0123456789abcdef0123456789abcdef01234567',
        ),
        ens: 'alice.eth',
        votingPower: VotingPower.fromBigInt(5000000000000000000n),
        firstActivityTimestamp: 1705320000,
        lastActivityTimestamp: 1718872200,
        delegationCount: 3,
      });
      const page = createPage([member], 1, 20, 1);

      const dto = mapDomainToDTO(page);

      expect(dto.metadata).toEqual({
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalRecords: 1,
      });
      expect(dto.data).toHaveLength(1);
      expect(dto.data[0].ens).toBe('alice.eth');
      expect(dto.data[0].votingPower).toBe('5000000000000000000');
      expect(dto.data[0].metrics.delegationCount).toBe(3);
    });
  });
});