import assert from 'node:assert';
import { buildDomain } from './support/buildDomain';
import {
  ALICE,
  BOB,
  DEFAULT_EVM_COIN_TYPE,
  PLUGIN,
  TOKEN,
} from './support/constants';
import {
  delegate,
  findMembersResponse,
  reverseName,
  reverseNamesResponse,
} from './support/fixtures/tokenVotingMembers';

describe('AragonDomain.getTokenVotingMembership', () => {
  it('returns a paginated DTO of token-voting members', async () => {
    const { domain } = buildDomain([
      findMembersResponse({
        delegates: [delegate(ALICE, { votingPower: '5000000000000000000' })],
      }),
      reverseNamesResponse([
        reverseName(ALICE, DEFAULT_EVM_COIN_TYPE, 'alice.eth'),
      ]),
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

  it('attaches the ENS name from the indexer ReverseName entity', async () => {
    const { domain } = buildDomain([
      findMembersResponse({ delegates: [delegate(ALICE), delegate(BOB)] }),
      reverseNamesResponse([
        reverseName(ALICE, DEFAULT_EVM_COIN_TYPE, 'alice.eth'),
      ]),
    ]);

    const response = await domain.getTokenVotingMembership({
      pluginAddress: PLUGIN,
      tokenContractAddress: TOKEN,
      page: 1,
      pageSize: 20,
    });

    assert(response.success);
    expect(response.result.data.map((m) => m.ens)).toEqual(['alice.eth', null]);
  });

  it('reflects a larger chain-wide total in the pagination metadata', async () => {
    const { domain } = buildDomain([
      findMembersResponse({ delegates: [delegate(ALICE)], totalRecords: 42 }),
      reverseNamesResponse(),
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

  it('skips the reverse-name query when the page is empty', async () => {
    const { domain, query } = buildDomain([findMembersResponse()]);

    const response = await domain.getTokenVotingMembership({
      pluginAddress: PLUGIN,
      tokenContractAddress: TOKEN,
      page: 1,
      pageSize: 20,
    });

    assert(response.success);
    expect(response.result.data).toHaveLength(0);
    // Only the members query ran; no second round-trip for ENS names.
    expect(query).toHaveBeenCalledTimes(1);
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
