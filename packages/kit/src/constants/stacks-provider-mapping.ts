import type { SupportedStacksWallet } from "./wallets";

export const STACKS_TO_STACKS_CONNECT_PROVIDERS: Record<
  Exclude<SupportedStacksWallet, "okx">,
  | "LeatherProvider"
  | "XverseProviders.BitcoinProvider"
  | "AsignaProvider"
  | "FordefiProviders.UtxoProvider"
  | "WalletConnectProvider"
> = {
  xverse: "XverseProviders.BitcoinProvider",
  leather: "LeatherProvider",
  asigna: "AsignaProvider",
  fordefi: "FordefiProviders.UtxoProvider",
  "wallet-connect": "WalletConnectProvider",
};
