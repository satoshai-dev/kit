---
"@satoshai/kit": patch
---

fix: accept pre-serialized post-conditions on OKX

`useWriteContract` with OKX serialized every post-condition again, so a
post-condition passed as a hex string (for example the PoX `staking` lock,
which some `@stacks/transactions` versions cannot build) threw
`Invalid post condition type` before the wallet opened. Hex strings now go to
OKX unchanged, and `pc.postConditions` accepts `string | PostCondition`, the
same as `@stacks/connect`.
