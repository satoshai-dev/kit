---
"@satoshai/kit": minor
---

Add typed error classes (UnsupportedMethodError, WalletNotConnectedError, WalletNotFoundError, WalletRequestError) following wagmi's error pattern. All hooks now throw typed errors that can be checked via `instanceof` or `error.name`.
