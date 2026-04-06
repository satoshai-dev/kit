# @satoshai/kit

## 1.0.2

### Patch Changes

- 5cb876e: Fix wallet extension detection timing on React 19 hydration

## 1.0.1

### Patch Changes

- e393787: Update @stacks/connect from 8.2.5 to 8.2.6

## 1.0.0

### Major Changes

- e534e92: Release v1.0.0 — stable API for typesafe Stacks wallet and contract interactions.

## 0.8.1

### Patch Changes

- d70a794: Add tests for `useSignStructuredMessage`, `useSignTransaction`, and `useTransferSTX` (including OKX variants). 34 new tests.

## 0.8.0

### Minor Changes

- 4ededf1: Add `useWalletConnect` hook to handle WalletConnect session lifecycle events. Detects zombie sessions on restore via relay ping (10s timeout), listens for wallet-initiated disconnect and account change events (generic `accountsChanged`, SIP-030 `stx_accountChange`, and `stx_accountsChanged`).

### Patch Changes

- f2e8259: Add JSDoc documentation to all consumer-facing exports (hooks, errors, types, utilities, provider) and update README with typed `useWriteContract` examples, `createContractConfig`, error handling guide, mutation return types, and WalletConnect session management.

## 0.7.0

### Minor Changes

- 059b504: Add typed error classes (UnsupportedMethodError, WalletNotConnectedError, WalletNotFoundError, WalletRequestError) following wagmi's error pattern. All hooks now throw typed errors that can be checked via `instanceof` or `error.name`.

### Patch Changes

- e34212d: Add wallet support matrix to README documenting which RPC methods each wallet supports

## 0.6.0

### Minor Changes

- 791f8f6: Add `useSignStructuredMessage` hook for SIP-018 structured data signing via `stx_signStructuredMessage`.
- 0e6241e: Add `useSignTransaction` hook for signing transactions without broadcasting via `stx_signTransaction`. Enables sponsored transaction flows.

### Patch Changes

- e566449: Move full API documentation to root README (GitHub landing page), slim packages/kit README to a pointer for npm

## 0.5.0

### Minor Changes

- 847d21e: Add typed `useWriteContract` with ABI inference (#35). Pass a Clarity ABI (`as const`) to get autocomplete on public function names and type-checked named args — no manual `ClarityValue` construction. Omitting `abi` preserves the current untyped API. Includes `createContractConfig` helper for reusable contract bindings and new type utilities (`PublicFunctionName`, `PublicFunctionArgs`, `TraitReference`).
- c46ee0a: Add `useTransferSTX` hook for native STX transfers via `stx_transferStx` RPC method with OKX wallet support.

  - `transferSTX(variables, options?)` — fire-and-forget with `onSuccess`, `onError`, `onSettled` callbacks
  - `transferSTXAsync(variables)` — Promise-based
  - Accepts `recipient`, `amount`, optional `memo`, `fee`, `nonce`
  - Returns `data` (txid), `error`, `status`, boolean flags, and `reset()`

## 0.4.1

### Patch Changes

- d4da112: Fix stale-fetch race condition in useBnsName when address changes rapidly
- 1d94bc5: Only fire onConnect callback on initial connection, not on address changes
- c14c5f0: Add comprehensive test coverage for all hooks: useAddress, useWallets, useBnsName, useSignMessage (OKX + publicKey), useWriteContract (standard + OKX), and useXverse

## 0.4.0

### Minor Changes

- 99778e7: Add `connectModal` prop to `StacksWalletProvider` (default `true`). When enabled, calling `connect()` with no arguments opens `@stacks/connect`'s built-in wallet selection modal. The `wallets` prop controls which wallets appear in the modal via `approvedProviderIds`. Calling `connect('xverse')` with an explicit provider still bypasses the modal regardless of the setting. All 6 wallets are supported in both modal and headless modes.
- 99778e7: Enrich `WalletInfo` with `name`, `icon`, and `webUrl` fields sourced from `@stacks/connect`'s provider metadata. This enables displaying wallet icons, names, and install links in custom UIs without hardcoding wallet data. Resolves #4.

### Patch Changes

- 74d07c8: Move wallet-connect projectId validation from useEffect to render body so it can be caught by React error boundaries
- aeb745b: Memoize onAddressChange callback to prevent Xverse setup effect from re-running on every render
- d0cfe9d: Fix SSR hydration mismatch by returning false for extension-based wallets when window is undefined

## 0.3.1

### Patch Changes

- 778c4cd: Fix stale wallet availability for browser extension wallets by removing useMemo from wallet detection

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
