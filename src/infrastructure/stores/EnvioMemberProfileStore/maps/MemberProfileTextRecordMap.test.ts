import { mapDTOToDomain } from './MemberProfileTextRecordMap';

describe('mapDTOToDomain', () => {
  it('rejects responses whose shape does not match the schema', () => {
    expect(() => mapDTOToDomain({ Domain: 'nope' })).toThrow();
    expect(() => mapDTOToDomain(null)).toThrow();
  });

  it('returns null when the indexer has no Domain row for this name', () => {
    expect(mapDTOToDomain({ Domain: [] })).toBeNull();
  });

  it('returns null when the Domain exists but has no resolver yet', () => {
    expect(mapDTOToDomain({ Domain: [{ resolver: null }] })).toBeNull();
  });

  it('builds a MemberProfileResolver carrying the resolver version + entries', () => {
    const resolver = mapDTOToDomain({
      Domain: [
        {
          resolver: {
            version: '0',
            texts: [
              { key: 'avatar', value: 'ipfs://x', version: '0' },
              { key: 'url', value: 'https://aragon.org', version: '0' },
            ],
          },
        },
      ],
    });

    expect(resolver).not.toBeNull();
    expect(resolver?.version).toBe('0');
    const live = resolver?.liveTextRecords() ?? [];
    expect(live.map((r) => r.key)).toEqual(['avatar', 'url']);
  });
});
