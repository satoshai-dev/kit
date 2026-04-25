---
"@satoshai/kit": minor
---

Fix `useSponsoredContractCall` to build sponsored transactions explicitly via `makeUnsignedContractCall` + `stx_signTransaction` instead of relying on wallet support for `sponsored: true` in `stx_callContract`.

Expose `publicKey` from `useAddress()` — extracted from the wallet's `getAddresses` response during connection and persisted in localStorage.
