---
"@satoshai/kit": patch
---

Fix potential useXverse listener leak when the effect cleanup races with the async addListener call.
