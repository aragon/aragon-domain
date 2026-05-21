import { ValueObject } from 'ddd-core-ts';
import { z } from 'zod';

const PARENT_DOMAIN = 'aragon.eth';
const PARENT_SUFFIX = `.${PARENT_DOMAIN}` as const;

/**
 * Normalizes a raw name input into its canonical form.
 */
function canonicalize(input: string): string {
  return input.normalize('NFC').trim().toLowerCase();
}

const MemberProfileAragonNamePropsSchema = z
  .object({
    value: z.string().min(1, 'name must not be empty'),
  })
  .transform(({ value }) => ({ value: canonicalize(value) }))
  .refine(
    (props) => props.value.endsWith(PARENT_SUFFIX),
    `name must end with ${PARENT_SUFFIX}`,
  )
  .refine((props) => {
    const label = props.value.slice(0, -PARENT_SUFFIX.length);
    return label.length > 0;
  }, 'name must include at least one label before .aragon.eth');

type MemberProfileAragonNameProps = z.output<
  typeof MemberProfileAragonNamePropsSchema
>;
type MemberProfileAragonNameInput = z.input<
  typeof MemberProfileAragonNamePropsSchema
>;

/**
 * Subdomain of `aragon.eth` issued by an ENS `MemberRegistry`.
 */
export class MemberProfileAragonName extends ValueObject<MemberProfileAragonNameProps> {
  toString(): string {
    return this.props.value;
  }

  static create(
    props: MemberProfileAragonNameInput,
  ): MemberProfileAragonName {
    const validated = MemberProfileAragonNamePropsSchema.parse(props);
    return new MemberProfileAragonName(validated);
  }

  static fromString(input: string): MemberProfileAragonName {
    return MemberProfileAragonName.create({ value: input });
  }
}
