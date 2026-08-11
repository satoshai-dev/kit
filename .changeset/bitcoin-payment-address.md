---
"@satoshai/kit": minor
---

feat: expose the connected wallet's Bitcoin payment address

Adds a `useBitcoinAddress()` hook returning the wallet's Bitcoin **payment**
address (native segwit, `p2wpkh`) and its public key — the send/receive address
used, for example, as the destination of an sBTC withdrawal (bridge-out). The
Stacks wallet state now also carries `btcAddress` / `btcPublicKey`.

Supported for **Xverse** and **Leather** (extracted from the existing
`getAddresses` response — no extra wallet prompt). Wallets that don't surface a
BTC payment address through that path (OKX, WalletConnect) report
`isAvailable: false`. The BTC address is kept in sync on Xverse in-wallet account
switches, and persisted/restored alongside the Stacks session.
