import { ValueObject } from 'ddd-core-ts';
import { z } from 'zod';
import { Address } from '@/domain/primitives';
import { VotingPower } from '@/domain/voting-power/VotingPower';

const TokenVotingMemberPropsSchema = z.object({
  address: z.instanceof(Address),
  pluginAddress: z.instanceof(Address),
  tokenContractAddress: z.instanceof(Address),
  votingPower: z.instanceof(VotingPower),
  ens: z.string().nullable(),
  firstActivityTimestamp: z.number().int().nonnegative(),
  lastActivityTimestamp: z.number().int().nonnegative(),
  delegationCount: z.number().int().nonnegative(),
});

type TokenVotingMemberProps = z.infer<typeof TokenVotingMemberPropsSchema>;

/**
 * A member of a TokenVoting plugin: combines on-chain delegation state
 * (voting power on the token contract) with per-plugin activity
 * timestamps (delegation, votes, proposal creations) sourced from the
 * indexer. Timestamps are unix seconds.
 */
export class TokenVotingMember extends ValueObject<TokenVotingMemberProps> {
  /**
   * The member's wallet address.
   */
  get address(): Address {
    return this.props.address;
  }

  /**
   * The TokenVoting plugin this member belongs to.
   */
  get pluginAddress(): Address {
    return this.props.pluginAddress;
  }

  /**
   * The ERC20Votes token contract this member holds voting power on.
   */
  get tokenContractAddress(): Address {
    return this.props.tokenContractAddress;
  }

  /**
   * The member's aggregated voting power on the token contract.
   */
  get votingPower(): VotingPower {
    return this.props.votingPower;
  }

  /**
   * The member's primary ENS name, or null if none is registered.
   * Sourced from the indexer's ReverseName entity.
   */
  get ens(): string | null {
    return this.props.ens;
  }

  /**
   * Unix-seconds timestamp of the member's first observed activity for
   * this plugin.
   */
  get firstActivityTimestamp(): number {
    return this.props.firstActivityTimestamp;
  }

  /**
   * Unix-seconds timestamp of the member's most recent observed
   * activity for this plugin.
   */
  get lastActivityTimestamp(): number {
    return this.props.lastActivityTimestamp;
  }

  /**
   * Number of distinct accounts currently delegating their voting
   * power to this member on the underlying ERC20Votes token (counts
   * self-delegation). Sourced from the indexer.
   */
  get delegationCount(): number {
    return this.props.delegationCount;
  }

  static create(props: TokenVotingMemberProps): TokenVotingMember {
    const validated = TokenVotingMemberPropsSchema.parse(props);
    return new TokenVotingMember(validated);
  }
}
