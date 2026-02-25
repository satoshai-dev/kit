---
"@satoshai/kit": minor
---

Update @stacks/connect to 8.2.5 (pinned) and leverage WalletConnect.initializeProvider for faster wallet-connect connections and session restores.

New features:
- `useWallets` hook — returns configured wallets with `available` flag (installed + configured check)
- `wallets` prop on `StacksWalletProvider` — configure which wallets to support
- `reset` on `useConnect` — clear stuck connecting state when wallet modals are dismissed
- `WalletInfo` type exported for consumers
- Runtime guard: throws if `wallet-connect` is in `wallets` without a `walletConnect.projectId`

Fixes:
- Moved runtime guard from render body to `useEffect` (React Strict Mode safe)
- `reset()` now invalidates in-flight `connect()` promises via generation counter (prevents stale state)
- Guard against concurrent `WalletConnect.initializeProvider` calls between session restore and connect

Breaking:
- Removed `useAvailableWallets` (replaced by `useWallets`)
- Removed `connectors` from `useConnect` (replaced by `useWallets`)
