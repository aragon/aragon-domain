import {
  type ERC20VotesDelegateDTO,
  type MemberMetricsDTO,
  mapDTOToDomain,
} from './TokenVotingMemberMap';

const PLUGIN = '0x1111111111111111111111111111111111111111';
const TOKEN = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const MEMBER = '0x0123456789abcdef0123456789abcdef01234567';

const buildDelegate = (
  overrides: Partial<ERC20VotesDelegateDTO> = {},
): ERC20VotesDelegateDTO => ({
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

const buildMetrics = (
  overrides: Partial<MemberMetricsDTO> = {},
): MemberMetricsDTO => ({
  id: `1-${PLUGIN}-${MEMBER}`,
  chainId: 1,
  pluginAddress: PLUGIN,
  memberAddress: MEMBER,
  firstActivityTimestamp: '1650000000',
  lastActivityTimestamp: '1750000000',
  ...overrides,
});

const buildResponse = (overrides: {
  ERC20VotesDelegate?: ERC20VotesDelegateDTO[];
  AllERC20VotesDelegate?: Array<{ id: string }>;
  MemberMetrics?: MemberMetricsDTO[];
}) => ({
  ERC20VotesDelegate: overrides.ERC20VotesDelegate ?? [],
  AllERC20VotesDelegate: overrides.AllERC20VotesDelegate ?? [],
  MemberMetrics: overrides.MemberMetrics ?? [],
});

describe('mapDTOToDomain', () => {
  it('throws when the response shape does not match', () => {
    expect(() => mapDTOToDomain({ ERC20VotesDelegate: 'oops' })).toThrow();
    expect(() => mapDTOToDomain(null)).toThrow();
  });

  it('returns a record per delegate plus the chain-wide total count', () => {
    const { records, totalRecords } = mapDTOToDomain(
      buildResponse({
        ERC20VotesDelegate: [buildDelegate()],
        AllERC20VotesDelegate: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
        MemberMetrics: [buildMetrics()],
      }),
    );

    expect(records).toHaveLength(1);
    expect(totalRecords).toBe(3);
  });

  it('pairs each delegate with its companion MemberMetrics row by address', () => {
    const { records } = mapDTOToDomain(
      buildResponse({
        ERC20VotesDelegate: [buildDelegate()],
        AllERC20VotesDelegate: [{ id: 'a' }],
        MemberMetrics: [buildMetrics()],
      }),
    );

    // metrics.firstActivityTimestamp (1650000000) is earlier than the
    // delegate's first VP change (1700000000); metrics.lastActivityTimestamp
    // (1750000000) is later than the delegate's last VP change (1700000100).
    expect(records[0].firstActivityTimestamp).toBe(1650000000);
    expect(records[0].lastActivityTimestamp).toBe(1750000000);
  });

  it('takes the earliest/latest activity when the delegate signals are the extremes', () => {
    const { records } = mapDTOToDomain(
      buildResponse({
        ERC20VotesDelegate: [
          buildDelegate({
            firstVotingPowerChangeTimestamp: '1600000000',
            lastVotingPowerChangeTimestamp: '1800000000',
          }),
        ],
        AllERC20VotesDelegate: [{ id: 'a' }],
        MemberMetrics: [buildMetrics()],
      }),
    );

    expect(records[0].firstActivityTimestamp).toBe(1600000000);
    expect(records[0].lastActivityTimestamp).toBe(1800000000);
  });

  it('reports 0 timestamps when neither signal is present', () => {
    const { records } = mapDTOToDomain(
      buildResponse({
        ERC20VotesDelegate: [
          buildDelegate({
            firstVotingPowerChangeTimestamp: null,
            lastVotingPowerChangeTimestamp: null,
          }),
        ],
        AllERC20VotesDelegate: [{ id: 'a' }],
        MemberMetrics: [],
      }),
    );

    expect(records[0].firstActivityTimestamp).toBe(0);
    expect(records[0].lastActivityTimestamp).toBe(0);
  });

  it('maps voting power and delegation count onto the record', () => {
    const { records } = mapDTOToDomain(
      buildResponse({
        ERC20VotesDelegate: [
          buildDelegate({ votingPower: '42', delegationCount: 7 }),
        ],
        AllERC20VotesDelegate: [{ id: 'a' }],
        MemberMetrics: [],
      }),
    );

    expect(records[0].votingPower.value.toBigNumber().toFixed(0)).toBe('42');
    expect(records[0].delegationCount).toBe(7);
  });
});
