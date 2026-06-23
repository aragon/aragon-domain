import {
  type ERC20VotesDelegateDTO,
  type MemberMetricsDTO,
  mapDTOToDomain,
  parseFindMembersResponse,
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

describe('parseFindMembersResponse', () => {
  it('parses a well-formed response', () => {
    const parsed = parseFindMembersResponse({
      ERC20VotesDelegate: [buildDelegate()],
      AllERC20VotesDelegate: [{ id: '1' }],
      MemberMetrics: [buildMetrics()],
    });

    expect(parsed.ERC20VotesDelegate).toHaveLength(1);
    expect(parsed.MemberMetrics).toHaveLength(1);
  });

  it('throws when the response shape does not match', () => {
    expect(() =>
      parseFindMembersResponse({ ERC20VotesDelegate: 'oops' }),
    ).toThrow();
    expect(() => parseFindMembersResponse(null)).toThrow();
  });
});

describe('mapDTOToDomain', () => {
  it('takes the min of metrics first-activity and delegate first-VP-change when both are defined and the metrics value is smaller', () => {
    // metrics.firstActivityTimestamp (1650000000) < delegate.firstVotingPowerChangeTimestamp (1700000000)
    const member = mapDTOToDomain(
      buildDelegate(),
      buildMetrics(),
      null,
    );
    expect(member.firstActivityTimestamp).toBe(1650000000);
  });

  it('takes the min when the delegate value is smaller (exercises the n < min comparison branch)', () => {
    const member = mapDTOToDomain(
      buildDelegate({ firstVotingPowerChangeTimestamp: '1600000000' }),
      buildMetrics({ firstActivityTimestamp: '1650000000' }),
      null,
    );
    expect(member.firstActivityTimestamp).toBe(1600000000);
  });

  it('takes the max of metrics last-activity and delegate last-VP-change when both are defined and the metrics value is larger', () => {
    // metrics.lastActivityTimestamp (1750000000) > delegate.lastVotingPowerChangeTimestamp (1700000100)
    const member = mapDTOToDomain(
      buildDelegate(),
      buildMetrics(),
      null,
    );
    expect(member.lastActivityTimestamp).toBe(1750000000);
  });

  it('takes the max when the delegate value is larger (exercises the n > max comparison branch)', () => {
    const member = mapDTOToDomain(
      buildDelegate({ lastVotingPowerChangeTimestamp: '1800000000' }),
      buildMetrics({ lastActivityTimestamp: '1750000000' }),
      null,
    );
    expect(member.lastActivityTimestamp).toBe(1800000000);
  });

  it('returns 0 timestamps when both signals are null/undefined', () => {
    // Delegate without VP-change timestamps, no metrics — the merger
    // should fall through to the `?? 0` sentinel on both sides.
    const member = mapDTOToDomain(
      buildDelegate({
        firstVotingPowerChangeTimestamp: null,
        lastVotingPowerChangeTimestamp: null,
      }),
      undefined,
      null,
    );
    expect(member.firstActivityTimestamp).toBe(0);
    expect(member.lastActivityTimestamp).toBe(0);
  });

  it('forwards the supplied ENS name to the domain object', () => {
    const member = mapDTOToDomain(
      buildDelegate(),
      undefined,
      'alice.eth',
    );
    expect(member.ens).toBe('alice.eth');
  });
});
