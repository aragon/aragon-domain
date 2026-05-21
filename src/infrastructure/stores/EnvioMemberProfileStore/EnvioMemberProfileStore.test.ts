import { MemberProfileAragonName } from '@/domain/member-profile/MemberProfileAragonName';
import type { EnvioClient } from '@/infrastructure/stores/EnvioClient';
import { EnvioMemberProfileStore } from './EnvioMemberProfileStore';

const CHAIN_ID = '1';
const RESOLVER = '0x231b0ee14048e9dccd1d247744d114a4eb5e8e63';
const NODE = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const textId = (version: string, key: string) =>
  `${CHAIN_ID}-${RESOLVER}-${NODE}-${version}-${key}`;

interface QueryCall {
  document: string;
  variables: Record<string, unknown>;
}

interface MockClient {
  envio: EnvioClient;
  calls: QueryCall[];
}

function buildMockEnvioClient(responses: unknown[]): MockClient {
  const calls: QueryCall[] = [];
  const queue = [...responses];
  const envio = {
    query: jest.fn(
      async (document: string, variables: Record<string, unknown>) => {
        calls.push({ document, variables });
        return queue.shift();
      },
    ),
  } as unknown as EnvioClient;
  return { envio, calls };
}

describe('EnvioMemberProfileStore', () => {
  const subdomain = MemberProfileAragonName.fromString('ea1.aragon.eth');

  it('returns the live text records for a subdomain', async () => {
    const { envio, calls } = buildMockEnvioClient([
      {
        Domain: [
          {
            id: 'domain-id',
            name: 'ea1.aragon.eth',
            resolver: {
              version: '0',
              texts: [
                { id: textId('0', 'avatar'), key: 'avatar', value: 'ipfs://x' },
                { id: textId('0', 'url'), key: 'url', value: 'https://aragon.org' },
              ],
            },
          },
        ],
      },
    ]);
    const store = new EnvioMemberProfileStore(envio);

    const result = await store.findTextRecordsBySubdomain(subdomain);

    expect(result).toHaveLength(2);
    expect(result[0].key).toBe('avatar');
    expect(result[0].value).toBe('ipfs://x');
    expect(result[1].key).toBe('url');
    expect(result[1].value).toBe('https://aragon.org');

    expect(calls).toHaveLength(1);
    expect(calls[0].variables).toEqual({ name: 'ea1.aragon.eth' });
  });

  it('queries the indexer by the subdomain canonical value', async () => {
    const { envio, calls } = buildMockEnvioClient([{ Domain: [] }]);
    const store = new EnvioMemberProfileStore(envio);

    const mixedCase = MemberProfileAragonName.fromString('EA1.Aragon.ETH');
    await store.findTextRecordsBySubdomain(mixedCase);

    expect(calls[0].variables).toEqual({ name: 'ea1.aragon.eth' });
  });

  it('drops text rows superseded by a VersionChanged bump', async () => {
    // Resolver is on version 1; the indexer still has the v0 row sitting
    // there. The store must filter it out.
    const { envio } = buildMockEnvioClient([
      {
        Domain: [
          {
            id: 'domain-id',
            name: 'ea1.aragon.eth',
            resolver: {
              version: '1',
              texts: [
                { id: textId('0', 'avatar'), key: 'avatar', value: 'stale' },
                { id: textId('1', 'avatar'), key: 'avatar', value: 'fresh' },
              ],
            },
          },
        ],
      },
    ]);
    const store = new EnvioMemberProfileStore(envio);

    const result = await store.findTextRecordsBySubdomain(subdomain);

    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('fresh');
  });

  it('drops cleared rows (value === null)', async () => {
    const { envio } = buildMockEnvioClient([
      {
        Domain: [
          {
            id: 'domain-id',
            name: 'ea1.aragon.eth',
            resolver: {
              version: '0',
              texts: [
                { id: textId('0', 'avatar'), key: 'avatar', value: null },
                { id: textId('0', 'url'), key: 'url', value: 'https://aragon.org' },
              ],
            },
          },
        ],
      },
    ]);
    const store = new EnvioMemberProfileStore(envio);

    const result = await store.findTextRecordsBySubdomain(subdomain);

    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('url');
  });

  it('preserves keys that contain hyphens', async () => {
    // The key segment may contain `-`. Version-extraction must not be
    // tripped up by it (we split on `-` and take parts[3]).
    const { envio } = buildMockEnvioClient([
      {
        Domain: [
          {
            id: 'domain-id',
            name: 'ea1.aragon.eth',
            resolver: {
              version: '7',
              texts: [
                {
                  id: textId('7', 'com.github-handle'),
                  key: 'com.github-handle',
                  value: 'aragon',
                },
              ],
            },
          },
        ],
      },
    ]);
    const store = new EnvioMemberProfileStore(envio);

    const result = await store.findTextRecordsBySubdomain(subdomain);

    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('com.github-handle');
    expect(result[0].value).toBe('aragon');
  });

  it('returns [] when the subdomain is not on the indexer', async () => {
    const { envio } = buildMockEnvioClient([{ Domain: [] }]);
    const store = new EnvioMemberProfileStore(envio);

    const result = await store.findTextRecordsBySubdomain(subdomain);

    expect(result).toEqual([]);
  });

  it('returns [] when the subdomain has no resolver set yet', async () => {
    const { envio } = buildMockEnvioClient([
      {
        Domain: [
          {
            id: 'domain-id',
            name: 'ea1.aragon.eth',
            resolver: null,
          },
        ],
      },
    ]);
    const store = new EnvioMemberProfileStore(envio);

    const result = await store.findTextRecordsBySubdomain(subdomain);

    expect(result).toEqual([]);
  });

  it('wraps GraphQL failures with a profile-level error', async () => {
    const envio = {
      query: jest.fn().mockRejectedValue(new Error('graphql exploded')),
    } as unknown as EnvioClient;
    const store = new EnvioMemberProfileStore(envio);

    await expect(store.findTextRecordsBySubdomain(subdomain)).rejects.toThrow(
      'Error querying member profile from Envio',
    );
  });
});
