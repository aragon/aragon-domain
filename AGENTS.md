# AGENTS.md — Aragon Subdomain

## What This Repo Is

This package encapsulates all governance business logic for the Aragon platform. It replaces business logic currently fragmented across `app-backend` (Node.js) and `app` (Next.js frontend), consolidating it into a single importable TypeScript package.

The package sits between the Envio on-chain indexer (`aragon-indexer/`) and the Next.js BFF layer. It queries indexed data from Envio, applies domain logic (membership aggregation, voting power calculation, permission checks), enriches with external data (ENS, token prices), and exposes use cases via a controller.

## How to Approach This Repo

### Read `ddd-core-ts` first

This repo is built on [`ddd-core-ts`](https://github.com/asciiman/ddd-core-ts). **Before writing any code, read the `ddd-core-ts` package README thoroughly.** It defines the specific patterns, base classes, naming conventions, and architectural rules that this repo must follow. Key things it covers:

- `ValueObject`, `Entity`, `UseCase`, `DomainError`, `DomainEvent`, `ProcessManager` base classes
- Store (repository) pattern: interface in domain, implementation in infrastructure
- Mapper and DTO conventions
- `handleRequest` controller wiring
- Zod validation at domain object creation
- Error handling with `ResultOrError` and `defineError`

Every domain object, use case, store, and controller in this repo must conform to the `ddd-core-ts` patterns. Do not invent alternative patterns.

### Follow the domain model diagram

The [Aragon Governance Membership Domain Model](https://www.figma.com/board/WTlB4By8MoKhh5BJ58dpVE/Aragon-Governance---Membership-Domain-Model) is the source of truth for naming and relationships. Use the terms from the diagram, not from legacy codebases (`app-backend`, `ve-governance-indexer`). Those are being deprecated.

Key domain concepts from the diagram:

- **Governance Plugin** — decides via votes, has Membership
- **Membership** — contains multiple Members
- **Member** — has Identity (ENS, avatar), Metrics, and Voting Power
- **Voting Power** — provided by different mechanisms depending on governance type
- **TokenVoting Delegation** — ERC20Votes: DelegateChanged, DelegateVotesChanged (all-or-nothing balance delegation)
- **VotingEscrow Delegation** — per-lock NFT delegation via EscrowIVotesAdapter
- Both TokenVoting Delegation and VotingEscrow Delegation provide VP to the TokenVoting Plugin

### Architecture layers

```
src/
├── domain/          # Pure business logic — no I/O, no infrastructure imports
├── use-cases/       # Application logic — orchestrates domain objects
└── infrastructure/  # Adapters — Envio client, ENS resolver, RPC readers, controllers
```

Dependencies flow inward: Infrastructure → Use Cases → Domain. The domain layer has zero external dependencies beyond `ddd-core-ts` and `zod`.

### Project structure within each layer

Follow the `ddd-core-ts` project structure conventions.

## Formatting Rules

1. **Indent with 2 spaces.** Configured via biome (`indentWidth: 2`). Run `pnpm run lint` to auto-format.
2. **JSDoc comments use multi-line format:**
   ```typescript
   /**
    * My comment
    */
   ```
   Never use single-line JSDoc (`/** My comment */`).
3. **Test files are colocated** with the source files they test: `Member.ts` → `Member.test.ts` in the same directory. Not in a separate `test/` folder.

## Primitives

The `src/domain/primitives/` directory contains reusable domain primitives. Always use these instead of raw types:

| Primitive | Use instead of | Import from |
|-----------|---------------|-------------|
| `Address` | `string` for Ethereum addresses | `@/domain/primitives` |
| `HexString` | `string` for 0x-prefixed hex values | `@/domain/primitives` |
| `HexNumber` | `string` or `bigint` for hex-encoded numbers | `@/domain/primitives` |
| `Wei` / `Gwei` / `Ether` | `BigNumber` for EVM unit values | `@/domain/primitives` |
| `UUID` | `string` for UUIDs | `@/domain/primitives` |
| `Page<T>` / `PageRequest` | ad-hoc pagination shapes | `@/domain/primitives` |

**Rules:**
- **Use `Address` for all Ethereum addresses** in domain objects and use cases. Never store addresses as raw strings in domain types.
- **Use `HexString` as the parameter type** for functions that accept 0x-prefixed hex strings (e.g., `Address.fromHexString(hex: HexString)`). This catches invalid inputs at compile time.
- **Cast to `HexString` at infrastructure boundaries** where external data enters as `string` (e.g., DTOs from Envio). Use `as HexString` in mappers — the runtime validation happens inside the primitive's factory method.
- **Serialize via `.toHexString()`** when converting domain objects to DTOs for external consumers.
- Import primitives from the barrel `@/domain/primitives`, not from individual files.

## Key Rules

1. **Domain objects use Zod validation** in their `create()` factory methods. No invalid objects can exist.
2. **Value objects are immutable.** Use copy-and-modify patterns for state changes.
3. **Use cases have a single `execute()` method** and a `code` string matching the class name.
4. **Store interfaces live in the domain layer.** Implementations live in infrastructure.
5. **All dependencies are constructor-injected.** No singletons, no service locator.
6. **Mappers are co-located** with the infrastructure code that uses them, not in the domain.
7. **One public class per file.** Filename matches the class name.
8. **No `I` prefix on interfaces.** Use `MemberStore`, not `IMemberStore`.
9. **`as const` over TypeScript enums.**
10. **Named exports only.** No default exports.

## Data Sources

The primary data source is the Envio indexer (`aragon-indexer/`), which is partitioned internally into a generic / Aragon split (see `aragon-indexer/CLAUDE.md` → "Split path"):

Generic (chain-wide ERC20Votes):
- `ERC20VotesDelegate` — per-(token, delegate) state: voting power, delegationCount, first/lastVotingPowerChangeTimestamp
- `Delegation` — per-(token, delegator) → currentDelegate

Aragon-specific:
- `Plugin` — Installed governance plugins (type, associated contracts)
- `VELock` — Voting escrow lock positions (amount, status, delegation)
- `MemberMetrics` — In-plugin engagement (VoteCast / ProposalCreated activity only)

`EnvioTokenVotingMemberStore.findMembersByPluginAndToken` is the join point between the two halves: it pulls `ERC20VotesDelegate` rows and `MemberMetrics` rows in one query and merges activity timestamps client-side via `min`/`max`. If the indexer is ever split into two separate Envio projects, this is the file that gets a second `EnvioClient` argument and runs two queries instead of one — no other code change required.

Infrastructure adapters query this data via Envio's GraphQL/SQL API. Additional data comes from:
- ENS resolution (name, avatar)
- On-chain RPC reads (real-time token balance, current voting power)
- Token price feeds (USD conversion)

## Mapper function naming

Every mapper module — controller-side and store-side — exposes its mapping conversion under one of two canonical names:

- `mapDTOToDomain(...)` for the DTO → domain direction.
- `mapDomainToDTO(...)` for the domain → DTO direction.

These names match what `ddd-core-ts`'s `handleRequest` looks up on controller-side mapper modules, so using them everywhere also keeps the controller and store layers consistent. Auxiliary helpers within a mapper (private parsers, ID-extraction utilities, etc.) keep descriptive names — the rule applies to the conversion function the rest of the codebase calls.

## GraphQL response handling

Anything returned by `EnvioClient.query` is `unknown`. The store's job is orchestration — form variables, call the client, hand the raw response off, combine results across queries, wrap errors. Shape assertions and DTO → domain conversion happen in mappers, which are the single trust boundary for indexer data.

Each query has a corresponding mapper module under the store's `maps/` directory. The mapper owns:

1. Zod schemas describing the expected response shape, with TypeScript types derived from those schemas via `z.infer<...>` so the schema is the single source of truth.
2. A `mapDTOToDomain(raw: unknown)` function that calls `.parse()` on the raw input and returns the domain objects. The Zod parse failure becomes a descriptive runtime error if the indexer's response shape ever drifts.
3. DTO → domain mapping. When the mapper passes raw inputs into a domain factory (`Address.fromHexString`, `TokenVotingMember.create`, etc.), the factory's own validation is the final shape check on the values inside the response.

Stores never declare DTO interfaces inline and never pass a type argument to `query`. Calling `await this.envio.query(QUERY, vars)` produces `unknown`; that goes straight into the mapper's `mapDTOToDomain` function.

## Testing

- Unit tests for domain logic (value objects, aggregates, pure functions)
- Unit tests for use cases with mocked store interfaces
- Integration tests for infrastructure adapters
- Test files colocated: `Member.ts` → `Member.test.ts`
- Use domain factory methods (`Member.create(...)`) to build test data
