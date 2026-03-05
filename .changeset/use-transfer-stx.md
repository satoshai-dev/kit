---
"@satoshai/kit": minor
---

Add `useTransferSTX` hook for native STX transfers via `stx_transferStx` RPC method with OKX wallet support.

- `transferSTX(variables, options?)` — fire-and-forget with `onSuccess`, `onError`, `onSettled` callbacks
- `transferSTXAsync(variables)` — Promise-based
- Accepts `recipient`, `amount`, optional `memo`, `fee`, `nonce`
- Returns `data` (txid), `error`, `status`, boolean flags, and `reset()`
