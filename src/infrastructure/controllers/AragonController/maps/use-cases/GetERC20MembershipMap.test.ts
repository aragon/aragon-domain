import { mapDTOToDomain } from './GetERC20MembershipMap';

describe('GetERC20MembershipMap.mapDTOToDomain', () => {
  const pluginAddress = '0x1111111111111111111111111111111111111111';
  const tokenContractAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

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
