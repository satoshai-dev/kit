import type { SupportedStacksWallet } from '../constants/wallets';

export type StacksChain = 'mainnet' | 'testnet';

export type MutationStatus = 'idle' | 'pending' | 'error' | 'success';

export interface WalletConnectMetadata {
    name: string;
    description: string;
    url: string;
    icons: string[];
}

export interface ConnectOptions {
    onSuccess?: (address: string, provider: SupportedStacksWallet) => void;
    onError?: (error: Error) => void;
}

export interface StacksWalletProviderProps {
    children: React.ReactNode;
    wallets?: SupportedStacksWallet[];
    walletConnect?: {
        projectId: string;
        metadata?: Partial<WalletConnectMetadata>;
        chains?: StacksChain[];
    };
    onConnect?: (provider: SupportedStacksWallet, address: string) => void;
    onAddressChange?: (newAddress: string) => void;
    onDisconnect?: () => void;
}

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

export interface WalletInfo {
    id: SupportedStacksWallet;
    available: boolean;
}

export type WalletContextValue = WalletState & {
    connect: (
        providerId: SupportedStacksWallet,
        options?: ConnectOptions
    ) => Promise<void>;
    disconnect: (callback?: () => void) => void;
    reset: () => void;
    wallets: WalletInfo[];
};
