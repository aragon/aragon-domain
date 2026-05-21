import { MemberProfileAragonName } from './MemberProfileAragonName';

describe('MemberProfileAragonName', () => {
  it('accepts a single-label subdomain of aragon.eth', () => {
    const name = MemberProfileAragonName.fromString('ea1.aragon.eth');
    expect(name.toString()).toBe('ea1.aragon.eth');
  });

  it('accepts a multi-segment label', () => {
    const name = MemberProfileAragonName.fromString('foo.bar.aragon.eth');
    expect(name.toString()).toBe('foo.bar.aragon.eth');
  });

  it('lowercases the input', () => {
    const name = MemberProfileAragonName.fromString('EA1.Aragon.ETH');
    expect(name.toString()).toBe('ea1.aragon.eth');
  });

  it('trims surrounding whitespace', () => {
    const name = MemberProfileAragonName.fromString('  ea1.aragon.eth  ');
    expect(name.toString()).toBe('ea1.aragon.eth');
  });

  it('NFC-normalizes the input', () => {
    // Both render as "café" but differ in length and bytes.
    const decomposed = 'caf\u0065\u0301.aragon.eth';
    const composed = 'caf\u00e9.aragon.eth';

    expect(decomposed).not.toBe(composed);
    expect(decomposed.length).toBe(composed.length + 1);

    const name = MemberProfileAragonName.fromString(decomposed);
    expect(name.toString()).toBe(composed);
  });

  it('rejects names that do not end in .aragon.eth', () => {
    expect(() => MemberProfileAragonName.fromString('vitalik.eth')).toThrow(
      /\.aragon\.eth/,
    );
  });

  it('rejects the bare parent domain', () => {
    expect(() => MemberProfileAragonName.fromString('aragon.eth')).toThrow(
      /label/,
    );
  });

  it('rejects an empty label before the parent', () => {
    expect(() => MemberProfileAragonName.fromString('.aragon.eth')).toThrow(
      /label/,
    );
  });

  it('rejects empty input', () => {
    expect(() => MemberProfileAragonName.fromString('')).toThrow();
  });

  it('two equal names are structurally equal', () => {
    const a = MemberProfileAragonName.fromString('ea1.aragon.eth');
    const b = MemberProfileAragonName.fromString('EA1.aragon.eth');
    expect(a.equals(b)).toBe(true);
  });

  it('two different names are not structurally equal', () => {
    const a = MemberProfileAragonName.fromString('ea1.aragon.eth');
    const b = MemberProfileAragonName.fromString('ea2.aragon.eth');
    expect(a.equals(b)).toBe(false);
  });

  it('toString returns the canonical value', () => {
    const name = MemberProfileAragonName.fromString('EA1.Aragon.ETH');
    expect(name.toString()).toBe('ea1.aragon.eth');
  });
});
