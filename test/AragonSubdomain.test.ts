import assert from 'node:assert';
import { AragonSubdomain, EnvioClient } from '../src';

const RESOLVER = '0x231b0ee14048e9dccd1d247744d114a4eb5e8e63';
const NODE =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

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
