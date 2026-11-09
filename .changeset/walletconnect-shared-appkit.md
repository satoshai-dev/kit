---
"@satoshai/kit": minor
---

Add `walletConnect.appKit`: run Stacks WalletConnect through the app's own Reown AppKit. Apps that also create an AppKit (for Bitcoin or EVM wallets) had two AppKit instances on the page, and the Stacks WalletConnect QR modal never opened. Use `getStacksAppKitConfig()` to add the Stacks networks to `createAppKit()`.
