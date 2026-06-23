import type { MemberStore } from '@/domain/member/MemberStore';
import { TokenVotingMember } from '@/domain/member/TokenVotingMember';
import { Address } from '@/domain/primitives';
import { createPage } from '@/domain/primitives/pagination/Page';
import { PageRequest } from '@/domain/primitives/pagination/PageRequest';
import { VotingPower } from '@/domain/voting-power/VotingPower';
import { GetTokenVotingMembershipUseCase } from './GetTokenVotingMembershipUseCase';

describe('GetTokenVotingMembershipUseCase', () => {
  const memberAddressValue = '0x1234567890abcdef1234567890abcdef12345678';
  const memberAddress = Address.fromHexString(memberAddressValue);
  const pluginAddress = '0x1111111111111111111111111111111111111111';
  const tokenContractAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  const firstActivityTimestamp = 1705320000;
  const lastActivityTimestamp = 1718872200;

  const buildMember = (ens: string | null = null): TokenVotingMember =>
    TokenVotingMember.create({
      address: memberAddress,
      votingPower: VotingPower.fromBigInt(5000000000000000000n),
      ens,
      firstActivityTimestamp,
      lastActivityTimestamp,
      delegationCount: 4,
    });

  const buildMockStore = (
    member: TokenVotingMember = buildMember(),
  ): MemberStore => ({
    findTokenVotingMembers: vi
      .fn()
      .mockResolvedValue(createPage([member], 1, 20, 1)),
  });

  const page = PageRequest.create({ page: 1, pageSize: 20 });

  it('returns a page of members', async () => {
    const useCase = new GetTokenVotingMembershipUseCase(buildMockStore());
    const result = await useCase.execute({
      pluginAddress,
      tokenContractAddress,
      page,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].address.equals(memberAddress)).toBe(true);
    expect(result.items[0].votingPower.isZero).toBe(false);
    expect(result.items[0].ens).toBeNull();
    expect(result.items[0].firstActivityTimestamp).toBe(firstActivityTimestamp);
    expect(result.items[0].lastActivityTimestamp).toBe(lastActivityTimestamp);
    expect(result.totalRecords).toBe(1);
  });

  it('passes plugin address, token address, and page to store', async () => {
    const store = buildMockStore();
    const useCase = new GetTokenVotingMembershipUseCase(store);
    await useCase.execute({ pluginAddress, tokenContractAddress, page });

    expect(store.findTokenVotingMembers).toHaveBeenCalledWith(
      pluginAddress,
      tokenContractAddress,
      page,
    );
  });

  it('forwards the ENS name attached to each TokenVotingMember', async () => {
    const useCase = new GetTokenVotingMembershipUseCase(
      buildMockStore(buildMember('alice.eth')),
    );
    const result = await useCase.execute({
      pluginAddress,
      tokenContractAddress,
      page,
    });

    expect(result.items[0].ens).toBe('alice.eth');
  });

  it('wraps store errors', async () => {
    const failingStore: MemberStore = {
      findTokenVotingMembers: vi.fn().mockRejectedValue(new Error('db down')),
    };
    const useCase = new GetTokenVotingMembershipUseCase(failingStore);

    await expect(
      useCase.execute({ pluginAddress, tokenContractAddress, page }),
    ).rejects.toThrow('Error while getting token-voting membership');
  });
});
