---
"@satoshai/kit": patch
---

Stabilize walletInfos memo by serializing the wallets array prop to a string key, preventing unnecessary re-computations when consumers pass inline arrays.
