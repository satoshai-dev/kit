export const SUPPORTED_STACKS_WALLETS = [
  "xverse",
  "leather",
  "asigna",
  "fordefi",
  "wallet-connect",
  "okx",
] as const;

export type SupportedStacksWallet = (typeof SUPPORTED_STACKS_WALLETS)[number];
