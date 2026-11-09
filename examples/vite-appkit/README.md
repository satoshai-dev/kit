# examples/vite-appkit

`@satoshai/kit` with the app's own Reown AppKit (`walletConnect: { appKit }`), plus an end-to-end suite that runs against the real WalletConnect relay.

Pages:

- `/` — one AppKit with the Bitcoin adapter and the Stacks networks from `getStacksAppKitConfig()`.
- `/wagmi.html` — the same with a wagmi (EVM) adapter as the active namespace.
- `/project-id.html` — no app AppKit: the kit gets only a `projectId` (the `@stacks/connect` WalletConnect path).

## Run

1. Put a WalletConnect project ID in `.env.local`:

   ```
   VITE_WALLETCONNECT_PROJECT_ID=<project id>
   ```

2. From this folder:

   ```sh
   pnpm exec playwright install chromium   # once
   pnpm dev                                 # http://localhost:5180
   pnpm e2e                                 # starts the dev server if it is not running
   pnpm check                               # typecheck; build packages/kit first
   ```

The suite pairs a headless WalletConnect wallet (`e2e/test-wallet.ts`, `@reown/walletkit`) with the page. The wallet signs Stacks requests with a random key and never broadcasts. It needs network access to the relay, so it is not part of CI.
