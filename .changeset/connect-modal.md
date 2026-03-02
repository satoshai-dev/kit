---
'@satoshai/kit': minor
---

Add `connectModal` prop to `StacksWalletProvider` (default `true`). When enabled, calling `connect()` with no arguments opens `@stacks/connect`'s built-in wallet selection modal. The `wallets` prop controls which wallets appear in the modal via `approvedProviderIds`. Calling `connect('xverse')` with an explicit provider still bypasses the modal regardless of the setting. All 6 wallets are supported in both modal and headless modes.
