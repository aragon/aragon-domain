import { extractVersion, mapDTOToDomain } from './MemberProfileTextRecordMap';

describe('extractVersion', () => {
  it('returns the 4th hyphen-separated segment of a well-formed id', () => {
    expect(extractVersion('1-0xresolver-0xnode-7-com.github-handle')).toBe('7');
  });

  it('returns an empty string when the id has fewer than 4 segments', () => {
    // This is the safety fallback for malformed indexer ids — the
    // production code path never produces these, but we still treat
    // them as "non-live" rather than crashing.
    expect(extractVersion('')).toBe('');
    expect(extractVersion('a-b-c')).toBe('');
  });
});

describe('mapDTOToDomain', () => {
  it('rejects responses whose shape does not match the schema', () => {
    expect(() => mapDTOToDomain({ Domain: 'nope' })).toThrow();
    expect(() => mapDTOToDomain(null)).toThrow();
  });
});
