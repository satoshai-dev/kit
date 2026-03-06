/** All wallet IDs supported by `@satoshai/kit`. */
export const SUPPORTED_STACKS_WALLETS = [
  "xverse",
  "leather",
  "asigna",
  "fordefi",
  "wallet-connect",
  "okx",
] as const;

/** Union of supported wallet identifiers. */
export type SupportedStacksWallet = (typeof SUPPORTED_STACKS_WALLETS)[number];
