import { ValueObject } from 'ddd-core-ts';
import { keccak256 } from 'js-sha3';
import { z } from 'zod';
import { HexNumber } from '../math/HexNumber';
import type { HexString } from '../validation/ZodHexString';

const AddressPropsSchema = z.object({
  addressValue: z
    .instanceof(HexNumber)
    .refine(
      (value) => value.getByteLength() === 20,
      'addressValue must be 20 bytes',
    ),
});

type AddressProps = z.infer<typeof AddressPropsSchema>;

/**
 * EIP-55 checksum: keccak256 the lowercase hex address (without 0x),
 * then uppercase each hex character where the corresponding hash nibble >= 8.
 */
function toChecksumAddress(hex: string): HexString {
  const addr = hex.replace(/^0x/, '').toLowerCase();
  const hash = keccak256(addr);
  let result = '0x';
  for (let i = 0; i < addr.length; i++) {
    const hashNibble = Number.parseInt(hash[i], 16);
    result += hashNibble >= 8 ? addr[i].toUpperCase() : addr[i];
  }
  return result as HexString;
}

export class Address extends ValueObject<AddressProps> {
  public toHexNumber(): HexNumber {
    return this.props.addressValue;
  }

  /**
   * @returns A 0x-prefixed checksum-based hex string of the address (EIP-55).
   */
  public toHexString(): HexString {
    return toChecksumAddress(this.props.addressValue.toHexString());
  }

  public equals(other: Address): boolean {
    return this.toHexString() === other.toHexString();
  }

  public static create(props: AddressProps): Address {
    const validatedProps = AddressPropsSchema.parse(props);
    return new Address(validatedProps);
  }

  /**
   * Creates an Address from a 0x-prefixed hex string.
   */
  public static fromHexString(hex: HexString): Address {
    return Address.create({
      addressValue: HexNumber.create({ hexNumberValue: hex }),
    });
  }
}
