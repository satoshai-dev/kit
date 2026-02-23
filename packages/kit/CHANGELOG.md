# @satoshai/kit

## 0.1.1

### Patch Changes

- Add package README with full API documentation

## 0.1.0

### Minor Changes

- Initial release — Wagmi-inspired React hooks for Stacks wallet interaction

  - `StacksWalletProvider` — React context provider with auto-reconnect and persistence
  - `useConnect` / `useDisconnect` — Connect and disconnect wallets
  - `useAddress` — Reactive wallet address and connection status
  - `useSignMessage` — Sign arbitrary messages with connected wallet
  - `useWriteContract` — Call smart contracts with post-conditions
  - `useBnsName` — Resolve BNS v2 names from addresses
  - 6 wallets supported: Xverse, Leather, OKX, Asigna, Fordefi, WalletConnect
  - Xverse account change detection
  - OKX-specific transaction signing flow
  - Next.js App Router compatible (`"use client"` banner)
