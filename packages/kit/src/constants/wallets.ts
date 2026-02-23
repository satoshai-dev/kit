export const SUPPORTED_STACKS_WALLETS = [
  "xverse",
  "leather",
  "okx",
  "asigna",
  "fordefi",
  "wallet-connect",
] as const;

export type SupportedStacksWallet = (typeof SUPPORTED_STACKS_WALLETS)[number];
