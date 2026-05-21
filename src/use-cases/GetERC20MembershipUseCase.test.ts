import { Address } from '@/domain/primitives';
import { createPage } from '@/domain/primitives/pagination/Page';
import { PageRequest } from '@/domain/primitives/pagination/PageRequest';
import { TokenVotingMember } from '@/domain/token-voting-member/TokenVotingMember';
import type { TokenVotingMemberStore } from '@/domain/token-voting-member/TokenVotingMemberStore';
import { VotingPower } from '@/domain/voting-power/VotingPower';
import { GetERC20MembershipUseCase } from './GetERC20MembershipUseCase';

describe('GetERC20MembershipUseCase', () => {
  const memberAddressValue = '0x1234567890abcdef1234567890abcdef12345678';
  const memberAddress = Address.fromHexString(memberAddressValue);
  const pluginAddressValue = '0x1111111111111111111111111111111111111111';
  const pluginAddressObj = Address.fromHexString(pluginAddressValue);
  const tokenContractAddressValue =
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  const tokenContractAddressObj = Address.fromHexString(
    tokenContractAddressValue,
  );
  const firstActivityTimestamp = 1705320000;
  const lastActivityTimestamp = 1718872200;

  const buildMember = (ens: string | null = null): TokenVotingMember =>
    TokenVotingMember.create({
      address: memberAddress,
      pluginAddress: pluginAddressObj,
      tokenContractAddress: tokenContractAddressObj,
      votingPower: VotingPower.fromBigInt(5000000000000000000n),
      ens,
      firstActivityTimestamp,
      lastActivityTimestamp,
      delegationCount: 4,
    });

  const buildMockStore = (
    member: TokenVotingMember = buildMember(),
  ): TokenVotingMemberStore => ({
    findMembersByPluginAndToken: vi
      .fn()
      .mockResolvedValue(createPage([member], 1, 20, 1)),
  });

  const page = PageRequest.create({ page: 1, pageSize: 20 });
  const pluginAddress = pluginAddressValue;
  const tokenContractAddress = tokenContractAddressValue;

  it('returns a page of members', async () => {
    const useCase = new GetERC20MembershipUseCase(buildMockStore());
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
    const useCase = new GetERC20MembershipUseCase(store);
    await useCase.execute({ pluginAddress, tokenContractAddress, page });

    expect(store.findMembersByPluginAndToken).toHaveBeenCalledWith(
      pluginAddress,
      tokenContractAddress,
      page,
    );
  });

  it('forwards the ENS name attached to each TokenVotingMember', async () => {
    const useCase = new GetERC20MembershipUseCase(
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
    const failingStore: TokenVotingMemberStore = {
      findMembersByPluginAndToken: vi
        .fn()
        .mockRejectedValue(new Error('db down')),
    };
    const useCase = new GetERC20MembershipUseCase(failingStore);

    await expect(
      useCase.execute({ pluginAddress, tokenContractAddress, page }),
    ).rejects.toThrow('Error while getting ERC20 membership');
  });
});
