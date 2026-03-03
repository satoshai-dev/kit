---
'@satoshai/kit': minor
---

Add typed `useWriteContract` with ABI inference (#35). Pass a Clarity ABI (`as const`) to get autocomplete on public function names and type-checked named args — no manual `ClarityValue` construction. Omitting `abi` preserves the current untyped API. Includes `createContractConfig` helper for reusable contract bindings and new type utilities (`PublicFunctionName`, `PublicFunctionArgs`, `TraitReference`).
