---
"@satoshai/kit": minor
---

Update @stacks/connect to 8.2.5 (pinned) and leverage WalletConnect.initializeProvider for faster wallet-connect connections and session restores.

New features:
- `useAvailableWallets` hook — returns wallets that are installed and configured
- `wallets` prop on `StacksWalletProvider` — configure which wallets to support
- `reset` on `useConnect` — clear stuck connecting state when wallet modals are dismissed
- Runtime guard: throws if `wallet-connect` is in `wallets` without a `walletConnect.projectId`
