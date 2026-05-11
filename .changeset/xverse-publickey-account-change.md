---
'@satoshai/kit': patch
---

Fix stale `publicKey` after Xverse in-wallet account switch. The cached `publicKey` is now refreshed alongside `address` when Xverse emits `accountChange`, so `useSponsoredContractCall` builds unsigned transactions with the active account's public key and the resulting signed tx passes `verifyOrigin()`.
