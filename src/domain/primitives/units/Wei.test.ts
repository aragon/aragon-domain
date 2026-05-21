import BigNumber from 'bignumber.js';

import { Wei } from './Wei';

describe('Wei', () => {
  it('returns the base value', () => {
    const value = new BigNumber('1230000000000000000');
    const token = Wei.create(value);
    expect(token.toBigNumber()).toEqual(value);
  });

  it('converts to Gwei', () => {
    const value = new BigNumber('1230000000000000000');
    const token = Wei.create(value);
    expect(token.toGwei().toBigNumber().toNumber()).toEqual(1_230_000_000);
  });

  it('converts to Ether', () => {
    const value = new BigNumber('1230000000000000000');
    const token = Wei.create(value);
    expect(token.toEther().toBigNumber().toNumber()).toEqual(1.23);
  });

  it('allows zero', () => {
    const value = new BigNumber(0);
    const token = Wei.create(value);
    expect(token.toBigNumber()).toEqual(value);
  });
});
