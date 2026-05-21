import BigNumber from 'bignumber.js';

import { Ether } from './Ether';

describe('Ether', () => {
  it('returns the base value', () => {
    const value = new BigNumber(1.23);
    const token = Ether.create(value);
    expect(token.toBigNumber()).toEqual(value);
  });

  it('converts to Wei', () => {
    const value = new BigNumber(1.23);
    const token = Ether.create(value);
    expect(token.toWei().toBigNumber().toString()).toEqual(
      '1230000000000000000',
    );
  });

  it('converts to Gwei', () => {
    const value = new BigNumber(1.23);
    const token = Ether.create(value);
    expect(token.toGwei().toBigNumber().toNumber()).toEqual(1_230_000_000);
  });

  it('allows zero', () => {
    const value = new BigNumber(0);
    const token = Ether.create(value);
    expect(token.toBigNumber()).toEqual(value);
  });
});
