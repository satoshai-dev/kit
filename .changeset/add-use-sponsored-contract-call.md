---
"@satoshai/kit": minor
---

Add `useSponsoredContractCall` hook for signing sponsored contract calls (SIP-030 `stx_callContract` with `sponsored: true`, `fee: '0'`). Returns the signed transaction hex for the consumer to forward to a sponsor service.

Remove `useSignTransaction` — superseded by `useSponsoredContractCall` which handles transaction building internally via the wallet.
