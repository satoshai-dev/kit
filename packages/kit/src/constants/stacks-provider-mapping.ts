import type { SupportedStacksWallet } from "./wallets";

export const OKX_PROVIDER_ID = "OkxStacksProvider";

export const STACKS_TO_STACKS_CONNECT_PROVIDERS: Record<
  SupportedStacksWallet,
  | "LeatherProvider"
  | "XverseProviders.BitcoinProvider"
  | "AsignaProvider"
  | "FordefiProviders.UtxoProvider"
  | "WalletConnectProvider"
  | typeof OKX_PROVIDER_ID
> = {
  xverse: "XverseProviders.BitcoinProvider",
  leather: "LeatherProvider",
  okx: OKX_PROVIDER_ID,
  asigna: "AsignaProvider",
  fordefi: "FordefiProviders.UtxoProvider",
  "wallet-connect": "WalletConnectProvider",
};

export const STACKS_CONNECT_TO_STACKS_PROVIDERS = Object.fromEntries(
  Object.entries(STACKS_TO_STACKS_CONNECT_PROVIDERS).map(([kit, connect]) => [
    connect,
    kit,
  ])
) as Record<string, SupportedStacksWallet>;
