import assert from 'node:assert';
import { AragonSubdomain, EnvioClient } from '../src';

const ALICE = '0x0123456789abcdef0123456789abcdef01234567';
const PLUGIN = '0x17a1688c56087ade762721180e1cc1e831c73719';
const TOKEN = '0x0a830e9f2baa2ebaf8d33c0806283dea9c08952f';
const RESOLVER = '0x231b0ee14048e9dccd1d247744d114a4eb5e8e63';
const NODE =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const DEFAULT_EVM_COIN_TYPE = '2147483648'; // 0x80000000

/**
 * Builds an AragonSubdomain backed by an EnvioClient whose `query`
 * method is replaced with a FIFO queue of canned responses. The
 * underlying GraphQLClient is constructed but never used at the
 * network layer.
 */
function buildController(responses: unknown[]): AragonSubdomain {
  const envio = new EnvioClient('https://unused.example.invalid');
  const queue = [...responses];
  vi.spyOn(envio, 'query').mockImplementation(async () => {
    if (queue.length === 0) {
      throw new Error('EnvioClient.query called more times than expected');
    }
    return queue.shift() as never;
  });
  return AragonSubdomain.load(envio);
}

describe('AragonSubdomain', () => {
  describe('getMembership', () => {
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

      const response = await controller.getMembership({
        pluginAddress: PLUGIN,
        tokenContractAddress: TOKEN,
        page: 1,
        pageSize: 15,
      });

      assert(response.success, 'expected getMembership to succeed');
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
    const textId = (version: string, key: string) =>
      `1-${RESOLVER}-${NODE}-${version}-${key}`;

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
                  {
                    id: textId('0', 'avatar'),
                    key: 'avatar',
                    value: 'ipfs://x',
                  },
                  {
                    id: textId('0', 'url'),
                    key: 'url',
                    value: 'https://aragon.org',
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

    it('returns a failed response when the subdomain targets .aragonx.eth', async () => {
      const controller = buildController([]);

      const response = await controller.getMemberProfileTextRecords({
        subdomain: 'ea1.aragonx.eth',
      });

      expect(response.success).toBe(false);
    });
  });
});
