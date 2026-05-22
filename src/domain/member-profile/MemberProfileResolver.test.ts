import { MemberProfileResolver } from './MemberProfileResolver';

describe('MemberProfileResolver', () => {
  it('returns entries whose version matches the resolver version', () => {
    const resolver = MemberProfileResolver.create({
      version: '0',
      entries: [
        { key: 'avatar', value: 'ipfs://x', version: '0' },
        { key: 'url', value: 'https://aragon.org', version: '0' },
      ],
    });

    const live = resolver.liveTextRecords();
    expect(live).toHaveLength(2);
    expect(live[0].key).toBe('avatar');
    expect(live[0].value).toBe('ipfs://x');
    expect(live[1].key).toBe('url');
    expect(live[1].value).toBe('https://aragon.org');
  });

  it('drops entries superseded by a VersionChanged bump', () => {
    // Resolver bumped to v1; the v0 row is still in storage but is no
    // longer live.
    const resolver = MemberProfileResolver.create({
      version: '1',
      entries: [
        { key: 'avatar', value: 'stale', version: '0' },
        { key: 'avatar', value: 'fresh', version: '1' },
      ],
    });

    const live = resolver.liveTextRecords();
    expect(live).toHaveLength(1);
    expect(live[0].value).toBe('fresh');
  });

  it('drops cleared entries (value === null)', () => {
    const resolver = MemberProfileResolver.create({
      version: '0',
      entries: [
        { key: 'avatar', value: null, version: '0' },
        { key: 'url', value: 'https://aragon.org', version: '0' },
      ],
    });

    const live = resolver.liveTextRecords();
    expect(live).toHaveLength(1);
    expect(live[0].key).toBe('url');
  });

  it('preserves empty-string values (cleared is null, not empty string)', () => {
    const resolver = MemberProfileResolver.create({
      version: '0',
      entries: [{ key: 'bio', value: '', version: '0' }],
    });

    const live = resolver.liveTextRecords();
    expect(live).toHaveLength(1);
    expect(live[0].value).toBe('');
  });

  it('returns [] when there are no entries', () => {
    const resolver = MemberProfileResolver.create({
      version: '0',
      entries: [],
    });

    expect(resolver.liveTextRecords()).toEqual([]);
  });

  it('exposes the current version', () => {
    const resolver = MemberProfileResolver.create({
      version: '7',
      entries: [],
    });
    expect(resolver.version).toBe('7');
  });

  it('rejects entries with an empty key', () => {
    expect(() =>
      MemberProfileResolver.create({
        version: '0',
        entries: [{ key: '', value: 'x', version: '0' }],
      }),
    ).toThrow();
  });

  it('rejects an empty resolver version', () => {
    expect(() =>
      MemberProfileResolver.create({
        version: '',
        entries: [],
      }),
    ).toThrow();
  });
});
