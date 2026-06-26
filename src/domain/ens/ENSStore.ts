import type { Address, HexString } from '@/domain/primitives';
import type { ENSName } from './ENSName';

export interface ENSStore {
  /**
   * Resolves the primary ENS name for each address.
   *
   * Returns a map keyed by checksummed hex address. Addresses with no
   * primary name, or whose name fails resolution or normalization, are
   * absent from the map. A missing key means "no name", never an error.
   *
   * @param coinType ENSIP-11 coin type selecting which chain's primary
   *   name to read. Implementations default to `60` (legacy Ethereum
   *   mainnet), which covers the overwhelming majority of primary names
   *   today. L2 / ENSIP-19 multichain names are only reached when a
   *   chain-specific coin type is passed.
   */
  lookUpPrimaryNames(
    addresses: Address[],
    coinType?: bigint,
  ): Promise<Map<HexString, ENSName>>;
}
