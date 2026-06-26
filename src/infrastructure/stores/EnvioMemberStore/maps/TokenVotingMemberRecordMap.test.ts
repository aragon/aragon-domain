import { mapDTOToDomain } from './TokenVotingMemberRecordMap';

const TOKEN = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const MEMBER = '0x0123456789abcdef0123456789abcdef01234567';

const buildDelegate = (overrides: Record<string, unknown> = {}) => ({
  id: `1-${TOKEN}-${MEMBER}`,
  chainId: 1,
  tokenContractAddress: TOKEN,
  delegateAddress: MEMBER,
  votingPower: '5000000000000000000',
  delegationCount: 1,
  firstVotingPowerChangeTimestamp: '1700000000',
  lastVotingPowerChangeTimestamp: '1700000100',
  ...overrides,
});

describe('TokenVotingMemberRecordMap.mapDTOToDomain', () => {
  it('throws when the response shape does not match', () => {
    expect(() => mapDTOToDomain({ ERC20VotesDelegate: 'oops' })).toThrow();
    expect(() => mapDTOToDomain(null)).toThrow();
  });

  it('maps records and reports the chain-wide total', () => {
    const { records, totalRecords } = mapDTOToDomain({
      ERC20VotesDelegate: [buildDelegate()],
      AllERC20VotesDelegate: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    });

    expect(records).toHaveLength(1);
    expect(totalRecords).toBe(3);
    expect(records[0].votingPower.value.toBigNumber().toFixed(0)).toBe(
      '5000000000000000000',
    );
    expect(records[0].delegationCount).toBe(1);
    expect(records[0].firstVotingPowerChangeTimestamp).toBe(1700000000);
    expect(records[0].lastVotingPowerChangeTimestamp).toBe(1700000100);
  });

  it('preserves null voting-power-change timestamps', () => {
    const { records } = mapDTOToDomain({
      ERC20VotesDelegate: [
        buildDelegate({
          firstVotingPowerChangeTimestamp: null,
          lastVotingPowerChangeTimestamp: null,
        }),
      ],
      AllERC20VotesDelegate: [{ id: 'a' }],
    });

    expect(records[0].firstVotingPowerChangeTimestamp).toBeNull();
    expect(records[0].lastVotingPowerChangeTimestamp).toBeNull();
  });
});
