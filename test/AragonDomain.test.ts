import assert from 'node:assert';
import { AragonDomain, EnvioClient } from '../src';

const ALICE = '0x0123456789abcdef0123456789abcdef01234567';
const PLUGIN = '0x17a1688c56087ade762721180e1cc1e831c73719';
const TOKEN = '0x0a830e9f2baa2ebaf8d33c0806283dea9c08952f';
const DEFAULT_EVM_COIN_TYPE = '2147483648'; // 0x80000000

/**
 * Builds an AragonDomain backed by an EnvioClient whose `query`
 * method is replaced with a FIFO queue of canned responses. The
 * underlying GraphQLClient is constructed but never used at the
 * network layer.
 */
function buildController(responses: unknown[]): AragonDomain {
  const envio = new EnvioClient('https://unused.example.invalid');
  const queue = [...responses];
  vi.spyOn(envio, 'query').mockImplementation(async () => {
    if (queue.length === 0) {
      throw new Error('EnvioClient.query called more times than expected');
    }
    return queue.shift() as never;
  });
  return AragonDomain.load(envio);
}

describe('AragonDomain', () => {
  describe('getTokenVotingMembership', () => {
    it('returns a paginated DTO of ERC20 members', async () => {
      const controller = buildController([
        {
          ERC20VotesDelegate: [
            {
              id: `1-${TOKEN}-${ALICE}`,
              chainId: 1,
              tokenContractAddress: TOKEN,
              delegateAddress: ALICE,
              votingPower: '5000000000000000000',
              delegationCount: 2,
              firstVotingPowerChangeTimestamp: '1700000000',
              lastVotingPowerChangeTimestamp: '1700000100',
            },
          ],
          AllERC20VotesDelegate: [{ id: 'a' }],
          MemberMetrics: [],
        },
        {
          ReverseName: [
            {
              address: ALICE,
              coinType: DEFAULT_EVM_COIN_TYPE,
              name: 'alice.eth',
            },
          ],
        },
      ]);

      const response = await controller.getTokenVotingMembership({
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
  });

  describe('getMemberProfileTextRecords', () => {
    it('returns the live text records as a DTO list', async () => {
      const controller = buildController([
        {
          Domain: [
            {
              id: 'domain-id',
              name: 'ea1.aragon.eth',
              resolver: {
                version: '0',
                texts: [
                  { key: 'avatar', value: 'ipfs://x', version: '0' },
                  {
                    key: 'url',
                    value: 'https://aragon.org',
                    version: '0',
                  },
                ],
              },
            },
          ],
        },
      ]);

      const response = await controller.getMemberProfileTextRecords({
        subdomain: 'ea1.aragon.eth',
      });

      assert(
        response.success,
        'expected getMemberProfileTextRecords to succeed',
      );
      expect(response.result).toEqual([
        { key: 'avatar', value: 'ipfs://x' },
        { key: 'url', value: 'https://aragon.org' },
      ]);
    });

    it('returns [] when the subdomain is unknown to the indexer', async () => {
      const controller = buildController([{ Domain: [] }]);

      const response = await controller.getMemberProfileTextRecords({
        subdomain: 'ea1.aragon.eth',
      });

      assert(response.success);
      expect(response.result).toEqual([]);
    });

    it('returns [] when the subdomain has no resolver yet', async () => {
      const controller = buildController([
        {
          Domain: [{ id: 'domain-id', name: 'ea1.aragon.eth', resolver: null }],
        },
      ]);

      const response = await controller.getMemberProfileTextRecords({
        subdomain: 'ea1.aragon.eth',
      });

      assert(response.success);
      expect(response.result).toEqual([]);
    });

    it('returns a failed response when the subdomain is not under .aragon.eth', async () => {
      const controller = buildController([]);

      const response = await controller.getMemberProfileTextRecords({
        subdomain: 'vitalik.eth',
      });

      expect(response.success).toBe(false);
    });
  });
});
