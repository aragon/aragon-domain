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

  it('returns a page of member records in a single query (no ENS round-trip)', async () => {
    const { envio, calls } = buildMockEnvioClient([
      {
        ERC20VotesDelegate: [buildDelegate(ALICE), buildDelegate(BOB)],
        AllERC20VotesDelegate: [{ id: 'a' }, { id: 'b' }],
        MemberMetrics: [],
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
  });

  it('merges MemberMetrics activity into the matching delegate record', async () => {
    const { envio } = buildMockEnvioClient([
      {
        ERC20VotesDelegate: [buildDelegate(ALICE)],
        AllERC20VotesDelegate: [{ id: 'a' }],
        MemberMetrics: [
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

    // metrics first-activity (1650000000) is earlier than the delegate's
    // first VP change (1700000000); metrics last-activity (1750000000) is
    // later than the delegate's last VP change (1700000100).
    expect(result.items[0].firstActivityTimestamp).toBe(1650000000);
    expect(result.items[0].lastActivityTimestamp).toBe(1750000000);
  });

  it('returns an empty page when there are no delegates', async () => {
    const { envio, calls } = buildMockEnvioClient([
      {
        ERC20VotesDelegate: [],
        AllERC20VotesDelegate: [],
        MemberMetrics: [],
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
