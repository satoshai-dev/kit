---
"@satoshai/kit": minor
---

Expose mutation state on all action hooks, aligned with wagmi's pattern. `useConnect`, `useDisconnect`, `useSignMessage`, and `useWriteContract` now return `error`, `isError`, `isIdle`, `isPending`, `isSuccess`, `status`, and `reset`. Adds `MutationStatus` type export.
