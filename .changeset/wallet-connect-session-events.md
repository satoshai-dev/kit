---
"@satoshai/kit": minor
---

Add `useWalletConnect` hook to handle WalletConnect session lifecycle events. Detects zombie sessions on restore via relay ping (10s timeout), listens for wallet-initiated disconnect and account change events (generic `accountsChanged`, SIP-030 `stx_accountChange`, and `stx_accountsChanged`).
