---
'@satoshai/kit': patch
---

Fix stale `publicKey` after Xverse in-wallet account switch. The cached `publicKey` is now refreshed alongside `address` when Xverse emits `accountChange`, so `useSponsoredContractCall` builds unsigned transactions with the active account's public key and the resulting signed tx passes `verifyOrigin()`.

Also bumps `bns-v2-sdk` (^2.1 → ^2.2) and `clarity-abitype` (^0.4 → ^0.6) along with several devDeps; no public API impact.
