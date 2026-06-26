import { Address } from '@/domain/primitives';
import { PageRequest } from '@/domain/primitives/pagination/PageRequest';
import type { EnvioClient } from '@/infrastructure/stores/EnvioClient';
import { EnvioMemberStore } from './EnvioMemberStore';

const PLUGIN = '0x1111111111111111111111111111111111111111';
const TOKEN = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

const PLUGIN_ADDRESS = Address.fromHexString(PLUGIN);
const TOKEN_ADDRESS = Address.fromHexString(TOKEN);

const ALICE = '0x0123456789abcdef0123456789abcdef01234567';
const BOB = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

interface QueryCall {
  document: string;
  variables: Record<string, unknown>;
}

interface MockClient {
  envio: EnvioClient;
  calls: QueryCall[];
}

/**
 * Builds an EnvioClient stub that returns each `response` in order for
 * the corresponding call.
 */
function buildMockEnvioClient(responses: unknown[]): MockClient {
  const calls: QueryCall[] = [];
  const queue = [...responses];
  const envio = {
    query: vi.fn(
      async (document: string, variables: Record<string, unknown>) => {
        calls.push({ document, variables });
        return queue.shift();
      },
    ),
  } as unknown as EnvioClient;
  return { envio, calls };
}

const buildDelegate = (
  address: string,
  votingPower = '5000000000000000000',
) => ({
  id: `1-${TOKEN}-${address}`,
  chainId: 1,
  tokenContractAddress: TOKEN,
  delegateAddress: address,
  votingPower,
  delegationCount: 1,
  firstVotingPowerChangeTimestamp: '1700000000',
  lastVotingPowerChangeTimestamp: '1700000100',
});

describe('EnvioMemberStore', () => {
  const page = PageRequest.create({ page: 1, pageSize: 20 });

  it('returns a page of record/metrics pairs in a single query (no ENS round-trip)', async () => {
    const { envio, calls } = buildMockEnvioClient([
      {
        ERC20VotesDelegate: [buildDelegate(ALICE), buildDelegate(BOB)],
        AllERC20VotesDelegate: [{ id: 'a' }, { id: 'b' }],
        MemberGovernanceMetrics: [],
      },
    ]);
    const store = new EnvioMemberStore(envio);

    const result = await store.findTokenVotingMembers(
      PLUGIN_ADDRESS,
      TOKEN_ADDRESS,
      page,
    );

    expect(result.items).toHaveLength(2);
    expect(result.totalRecords).toBe(2);
    expect(calls).toHaveLength(1);
    // No governance metrics for these members → null on each pair.
    expect(result.items[0].metrics).toBeNull();
  });

  it('pairs MemberGovernanceMetrics with the matching record by address', async () => {
    const { envio } = buildMockEnvioClient([
      {
        ERC20VotesDelegate: [buildDelegate(ALICE)],
        AllERC20VotesDelegate: [{ id: 'a' }],
        MemberGovernanceMetrics: [
          {
            id: `1-${PLUGIN}-${ALICE}`,
            chainId: 1,
            pluginAddress: PLUGIN,
            memberAddress: ALICE,
            firstActivityTimestamp: '1650000000',
            lastActivityTimestamp: '1750000000',
          },
        ],
      },
    ]);
    const store = new EnvioMemberStore(envio);

    const result = await store.findTokenVotingMembers(
      PLUGIN_ADDRESS,
      TOKEN_ADDRESS,
      page,
    );

    const { record, metrics } = result.items[0];
    expect(record.address.toHexString().toLowerCase()).toBe(ALICE);
    expect(record.firstVotingPowerChangeTimestamp).toBe(1700000000);
    expect(metrics?.firstActivityTimestamp).toBe(1650000000);
    expect(metrics?.lastActivityTimestamp).toBe(1750000000);
  });

  it('returns an empty page when there are no delegates', async () => {
    const { envio, calls } = buildMockEnvioClient([
      {
        ERC20VotesDelegate: [],
        AllERC20VotesDelegate: [],
        MemberGovernanceMetrics: [],
      },
    ]);
    const store = new EnvioMemberStore(envio);

    const result = await store.findTokenVotingMembers(
      PLUGIN_ADDRESS,
      TOKEN_ADDRESS,
      page,
    );

    expect(result.items).toHaveLength(0);
    expect(calls).toHaveLength(1);
  });

  it('wraps query failures with a member-level error', async () => {
    const envio = {
      query: vi.fn().mockRejectedValue(new Error('graphql exploded')),
    } as unknown as EnvioClient;
    const store = new EnvioMemberStore(envio);

    await expect(
      store.findTokenVotingMembers(PLUGIN_ADDRESS, TOKEN_ADDRESS, page),
    ).rejects.toThrow('Error querying members from Envio');
  });
});
