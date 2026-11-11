---
"@satoshai/kit": minor
---

Add `useSignContractCall`: build a standard contract call in the app and have the wallet only sign it (`stx_signTransaction`, no broadcast), so any post-condition mode reaches the wallet unchanged, including originator mode (SIP-040). Raise the `@stacks/transactions` peer range to `>=7.4.0`.
