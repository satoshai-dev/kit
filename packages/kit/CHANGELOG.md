# @satoshai/kit

## 0.3.0

### Minor Changes

- 18d9827: Expose mutation state on all action hooks, aligned with wagmi's pattern. `useConnect`, `useDisconnect`, `useSignMessage`, and `useWriteContract` now return `error`, `isError`, `isIdle`, `isPending`, `isSuccess`, `status`, and `reset`. Adds `MutationStatus` type export.

## 0.2.0

### Minor Changes

- 08e83c6: Update @stacks/connect to 8.2.5 (pinned) and leverage WalletConnect.initializeProvider for faster wallet-connect connections and session restores.

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

### Patch Changes

- b8eeec9: Fix OKX connect failure disconnecting the wrong provider by skipping the generic disconnect path for OKX, which uses its own SDK directly.
- 3129b61: Stabilize walletInfos memo by serializing the wallets array prop to a string key, preventing unnecessary re-computations when consumers pass inline arrays.
- 1002d52: Document that wallets and walletConnect props should be defined outside the component as static configuration.
- 1d7612a: Add early-exit checks to useXverse async setup to skip unnecessary work when the effect is cleaned up during pending awaits.

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
