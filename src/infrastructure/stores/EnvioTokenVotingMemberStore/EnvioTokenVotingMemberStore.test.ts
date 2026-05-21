import { PageRequest } from '@/domain/primitives/pagination/PageRequest';
import type { EnvioClient } from '@/infrastructure/stores/EnvioClient';
import { EnvioTokenVotingMemberStore } from './EnvioTokenVotingMemberStore';

const PLUGIN = '0x1111111111111111111111111111111111111111';
const TOKEN = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

const ALICE = '0x0123456789abcdef0123456789abcdef01234567';
const BOB = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const ETH_COIN_TYPE = '60';
const DEFAULT_EVM_COIN_TYPE = '2147483648'; // 0x80000000

interface QueryCall {
  document: string;
  variables: Record<string, unknown>;
}

interface MockClient {
  envio: EnvioClient;
  calls: QueryCall[];
}

/**
 * Builds an EnvioClient stub that returns each `response` in order
 * for the corresponding call. The first call resolves with the
 * members response; the second with the reverse-names response.
 */
function buildMockEnvioClient(responses: unknown[]): MockClient {
  const calls: QueryCall[] = [];
  const queue = [...responses];
  const envio = {
    query: jest.fn(async (document: string, variables: Record<string, unknown>) => {
      calls.push({ document, variables });
      return queue.shift();
    }),
  } as unknown as EnvioClient;
  return { envio, calls };
}

const buildDelegate = (address: string, votingPower = '5000000000000000000') => ({
  id: `1-${TOKEN}-${address}`,
  chainId: 1,
  tokenContractAddress: TOKEN,
  delegateAddress: address,
  votingPower,
  delegationCount: 1,
  firstVotingPowerChangeTimestamp: '1700000000',
  lastVotingPowerChangeTimestamp: '1700000100',
});

describe('EnvioTokenVotingMemberStore', () => {
  const page = PageRequest.create({ page: 1, pageSize: 20 });

  it('attaches ENS names from the indexer ReverseName entity to each member', async () => {
    const { envio, calls } = buildMockEnvioClient([
      {
        ERC20VotesDelegate: [buildDelegate(ALICE), buildDelegate(BOB)],
        AllERC20VotesDelegate: [{ id: 'a' }, { id: 'b' }],
        MemberMetrics: [],
      },
      {
        ReverseName: [
          { address: ALICE, coinType: DEFAULT_EVM_COIN_TYPE, name: 'alice.eth' },
        ],
      },
    ]);
    const store = new EnvioTokenVotingMemberStore(envio);

    const result = await store.findMembersByPluginAndToken(PLUGIN, TOKEN, page);

    expect(result.items.map((m) => m.ens)).toEqual(['alice.eth', null]);

    // The reverse-name query was scoped to just the page's addresses.
    expect(calls).toHaveLength(2);
    expect(calls[1].variables).toEqual({ addresses: [ALICE, BOB] });
  });

  it('prefers the ENSIP-19 default.reverse name (coinType 0x80000000) over the legacy coinType 60 entry', async () => {
    // Indexer is ordered by coinType desc, so the modern row arrives
    // first. Verifying that the dedupe keeps the first row per address.
    const { envio } = buildMockEnvioClient([
      {
        ERC20VotesDelegate: [buildDelegate(ALICE)],
        AllERC20VotesDelegate: [{ id: 'a' }],
        MemberMetrics: [],
      },
      {
        ReverseName: [
          { address: ALICE, coinType: DEFAULT_EVM_COIN_TYPE, name: 'alice-default.eth' },
          { address: ALICE, coinType: ETH_COIN_TYPE, name: 'alice-legacy.eth' },
        ],
      },
    ]);
    const store = new EnvioTokenVotingMemberStore(envio);

    const result = await store.findMembersByPluginAndToken(PLUGIN, TOKEN, page);

    expect(result.items[0].ens).toBe('alice-default.eth');
  });

  it('falls back to legacy coinType 60 when no default.reverse row exists', async () => {
    const { envio } = buildMockEnvioClient([
      {
        ERC20VotesDelegate: [buildDelegate(ALICE)],
        AllERC20VotesDelegate: [{ id: 'a' }],
        MemberMetrics: [],
      },
      {
        ReverseName: [
          { address: ALICE, coinType: ETH_COIN_TYPE, name: 'alice-legacy.eth' },
        ],
      },
    ]);
    const store = new EnvioTokenVotingMemberStore(envio);

    const result = await store.findMembersByPluginAndToken(PLUGIN, TOKEN, page);

    expect(result.items[0].ens).toBe('alice-legacy.eth');
  });

  it('skips the reverse-name query when the page is empty', async () => {
    const { envio, calls } = buildMockEnvioClient([
      {
        ERC20VotesDelegate: [],
        AllERC20VotesDelegate: [],
        MemberMetrics: [],
      },
    ]);
    const store = new EnvioTokenVotingMemberStore(envio);

    const result = await store.findMembersByPluginAndToken(PLUGIN, TOKEN, page);

    expect(result.items).toHaveLength(0);
    expect(calls).toHaveLength(1);
  });

  it('lowercases the addresses passed to the reverse-name query', async () => {
    const ALICE_MIXED = '0x0123456789ABCDEF0123456789ABCDEF01234567';
    const { envio, calls } = buildMockEnvioClient([
      {
        ERC20VotesDelegate: [buildDelegate(ALICE_MIXED)],
        AllERC20VotesDelegate: [{ id: 'a' }],
        MemberMetrics: [],
      },
      { ReverseName: [] },
    ]);
    const store = new EnvioTokenVotingMemberStore(envio);

    await store.findMembersByPluginAndToken(PLUGIN, TOKEN, page);

    expect(calls[1].variables).toEqual({ addresses: [ALICE] });
  });

  it('wraps query failures with a member-level error', async () => {
    const envio = {
      query: jest.fn().mockRejectedValue(new Error('graphql exploded')),
    } as unknown as EnvioClient;
    const store = new EnvioTokenVotingMemberStore(envio);

    await expect(
      store.findMembersByPluginAndToken(PLUGIN, TOKEN, page),
    ).rejects.toThrow('Error querying members from Envio');
  });
});
