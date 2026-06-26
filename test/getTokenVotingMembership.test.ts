import assert from 'node:assert';
import { createPublicClient } from 'viem';
import { buildDomain } from './support/buildDomain';
import { ALICE, BOB, PLUGIN, TOKEN } from './support/constants';
import {
  delegate,
  findMembersResponse,
} from './support/fixtures/tokenVotingMembers';

// Stubbing `createPublicClient` so we can return a fake `getEnsName`that
// we can mock.
vi.mock('viem', async (importOriginal) => ({
  ...(await importOriginal<typeof import('viem')>()),
  createPublicClient: vi.fn(),
  http: vi.fn(),
}));

function stubEnsNames(table: Record<string, string | null>) {
  const getEnsName = vi.fn(
    async ({ address }: { address: string; coinType?: bigint }) =>
      table[address.toLowerCase()] ?? null,
  );
  vi.mocked(createPublicClient).mockReturnValue({ getEnsName } as never);
  return getEnsName;
}

beforeEach(() => {
  vi.clearAllMocks();
  stubEnsNames({});
});

describe('AragonDomain.getTokenVotingMembership', () => {
  it('returns a paginated DTO of token-voting members', async () => {
    stubEnsNames({ [ALICE]: 'alice.eth' });
    const { domain } = buildDomain([
      findMembersResponse({
        delegates: [delegate(ALICE, { votingPower: '5000000000000000000' })],
      }),
    ]);

    const response = await domain.getTokenVotingMembership({
      pluginAddress: PLUGIN,
      tokenContractAddress: TOKEN,
      page: 1,
      pageSize: 15,
    });

    assert(response.success, 'expected getTokenVotingMembership to succeed');
    expect(response.result.metadata).toEqual({
      page: 1,
      pageSize: 15,
      totalPages: 1,
      totalRecords: 1,
    });
    expect(response.result.data).toHaveLength(1);
    expect(response.result.data[0]).toEqual(
      expect.objectContaining({
        ens: 'alice.eth',
        votingPower: '5000000000000000000',
      }),
    );
    expect(response.result.data[0].address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it('attaches the primary ENS name resolved via the ENS client', async () => {
    const getEnsName = stubEnsNames({ [ALICE]: 'alice.eth' });
    const { domain } = buildDomain([
      findMembersResponse({ delegates: [delegate(ALICE), delegate(BOB)] }),
    ]);

    const response = await domain.getTokenVotingMembership({
      pluginAddress: PLUGIN,
      tokenContractAddress: TOKEN,
      page: 1,
      pageSize: 20,
    });

    assert(response.success);
    // ALICE resolves; BOB has no primary name -> null.
    expect(response.result.data.map((m) => m.ens)).toEqual(['alice.eth', null]);
    expect(getEnsName).toHaveBeenCalledTimes(2);
  });

  it('reflects a larger chain-wide total in the pagination metadata', async () => {
    const { domain } = buildDomain([
      findMembersResponse({ delegates: [delegate(ALICE)], totalRecords: 42 }),
    ]);

    const response = await domain.getTokenVotingMembership({
      pluginAddress: PLUGIN,
      tokenContractAddress: TOKEN,
      page: 1,
      pageSize: 20,
    });

    assert(response.success);
    expect(response.result.metadata.totalRecords).toBe(42);
    expect(response.result.metadata.totalPages).toBe(3);
  });

  it('resolves ENS out-of-band: one indexer query, names via the ENS client', async () => {
    const getEnsName = stubEnsNames({ [ALICE]: 'alice.eth' });
    const { domain, query } = buildDomain([
      findMembersResponse({ delegates: [delegate(ALICE)] }),
    ]);

    const response = await domain.getTokenVotingMembership({
      pluginAddress: PLUGIN,
      tokenContractAddress: TOKEN,
      page: 1,
      pageSize: 20,
    });

    assert(response.success);
    expect(response.result.data[0].ens).toBe('alice.eth');
    expect(query).toHaveBeenCalledTimes(1);
    expect(getEnsName).toHaveBeenCalledTimes(1);
  });

  it('issues no ENS lookups when the page is empty', async () => {
    const getEnsName = stubEnsNames({});
    const { domain, query } = buildDomain([findMembersResponse()]);

    const response = await domain.getTokenVotingMembership({
      pluginAddress: PLUGIN,
      tokenContractAddress: TOKEN,
      page: 1,
      pageSize: 20,
    });

    assert(response.success);
    expect(response.result.data).toHaveLength(0);
    expect(query).toHaveBeenCalledTimes(1);
    expect(getEnsName).not.toHaveBeenCalled();
  });

  it('returns a failed response when the indexer query errors', async () => {
    // Empty queue → the store's first query throws, surfacing as a
    // failed ResultOrError rather than a rejected promise.
    const { domain } = buildDomain([]);

    const response = await domain.getTokenVotingMembership({
      pluginAddress: PLUGIN,
      tokenContractAddress: TOKEN,
      page: 1,
      pageSize: 20,
    });

    expect(response.success).toBe(false);
  });
});
