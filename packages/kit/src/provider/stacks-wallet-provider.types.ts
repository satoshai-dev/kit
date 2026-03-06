import type { SupportedStacksWallet } from '../constants/wallets';

/** Stacks network identifier. */
export type StacksChain = 'mainnet' | 'testnet';

/** Status of a mutation hook (`useConnect`, `useSignMessage`, etc.). */
export type MutationStatus = 'idle' | 'pending' | 'error' | 'success';

/** Metadata passed to the WalletConnect relay for dApp identification. */
export interface WalletConnectMetadata {
    name: string;
    description: string;
    url: string;
    icons: string[];
}

/** Optional callbacks for {@link useConnect}. */
export interface ConnectOptions {
    /** Called with the connected address and wallet ID on success. */
    onSuccess?: (address: string, provider: SupportedStacksWallet) => void;
    /** Called when the connection fails or is rejected. */
    onError?: (error: Error) => void;
}

/** Props for the {@link StacksWalletProvider} component. */
export interface StacksWalletProviderProps {
    children: React.ReactNode;
    /**
     * Wallets to enable. Defaults to all supported wallets.
     *
     * **Tip:** Define this array outside your component or memoize it to keep
     * the reference stable across renders.
     */
    wallets?: SupportedStacksWallet[];
    /** Show @stacks/connect's built-in wallet selection modal when `connect()` is called without a `providerId`. Defaults to `true`. Set to `false` to manage wallet selection yourself (headless). */
    connectModal?: boolean;
    /**
     * WalletConnect configuration. Required when `wallets` includes `'wallet-connect'`.
     *
     * **Tip:** Define this object outside your component or memoize it to keep
     * the reference stable across renders.
     */
    walletConnect?: {
        /** WalletConnect Cloud project ID from https://cloud.walletconnect.com. */
        projectId: string;
        /** Override default dApp metadata shown in the wallet. */
        metadata?: Partial<WalletConnectMetadata>;
        /** Stacks chains to request. Defaults to `['mainnet']`. */
        chains?: StacksChain[];
    };
    /** Called after a wallet successfully connects. */
    onConnect?: (provider: SupportedStacksWallet, address: string) => void;
    /** Called when the connected account changes (e.g. Xverse account switch, WalletConnect account change). */
    onAddressChange?: (newAddress: string) => void;
    /** Called when the wallet disconnects (user-initiated or session expiry). */
    onDisconnect?: () => void;
}

/**
 * Discriminated union representing the wallet connection state.
 *
 * When `status` is `'connected'`, `address` and `provider` are guaranteed
 * to be defined.
 */
export type WalletState =
    | {
          status: 'disconnected';
          address: undefined;
          provider: undefined;
      }
    | {
          status: 'connecting';
          address: undefined;
          provider: undefined;
      }
    | {
          status: 'connected';
          address: string;
          provider: SupportedStacksWallet;
      };

/** Metadata for a single wallet returned by {@link useWallets}. */
export interface WalletInfo {
    /** Wallet identifier used with `connect(id)`. */
    id: SupportedStacksWallet;
    /** Human-readable wallet name. */
    name: string;
    /** Wallet icon as a data URI. */
    icon: string;
    /** URL to download/install the wallet extension. */
    webUrl: string;
    /** `true` when the wallet extension is detected or WalletConnect is configured. */
    available: boolean;
}

/** Full context value exposed by `StacksWalletProvider`. Extends {@link WalletState} with actions and wallet list. */
export type WalletContextValue = WalletState & {
    /** Connect to a wallet. Pass a wallet ID to bypass the modal, or call with no args to show the `@stacks/connect` modal. */
    connect: (
        providerId?: SupportedStacksWallet,
        options?: ConnectOptions
    ) => Promise<void>;
    /** Disconnect the current wallet and clear persisted state. */
    disconnect: (callback?: () => void) => void;
    /** Reset a stuck connecting state back to idle. */
    reset: () => void;
    /** All configured wallets with availability status. */
    wallets: WalletInfo[];
};
