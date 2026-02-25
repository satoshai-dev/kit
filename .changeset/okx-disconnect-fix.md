---
"@satoshai/kit": patch
---

Fix OKX connect failure disconnecting the wrong provider by skipping the generic disconnect path for OKX, which uses its own SDK directly.
