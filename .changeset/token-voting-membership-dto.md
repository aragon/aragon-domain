---
"@aragon/aragon-domain": minor
---

Adopt the token-voting membership DTO as the public list type and tidy the
membership domain. The controller exposes `getTokenVotingMembership` returning
a generic `PageDTO<TokenVotingMemberDTO>`. Public type exports (type-only):
`TokenVotingMemberDTO`, `PageDTO`, and `GetTokenVotingMembershipRequestDTO`.
Internally the membership domain collapses to a single `TokenVotingMember`
value object served by a `MemberStore` (`findTokenVotingMembers`). Behavior is
unchanged; runtime exports remain `AragonSubdomain` + `EnvioClient`.
