// Provider
export { StacksWalletProvider } from './provider/stacks-wallet-provider';

// Hooks
export { useAddress } from './hooks/use-address';
export { useConnect } from './hooks/use-connect';
export { useDisconnect } from './hooks/use-disconnect';
export {
    useSignMessage,
    type SignMessageVariables,
    type SignMessageData,
    type SignMessageOptions,
} from './hooks/use-sign-message';
export {
    useWriteContract,
    type WriteContractVariables,
    type WriteContractOptions,
    type PostConditionConfig,
} from './hooks/use-write-contract/use-write-contract';
export { useBnsName } from './hooks/use-bns-name';
export { useAvailableWallets } from './hooks/use-available-wallets';

// Types
export type {
    WalletState,
    WalletContextValue,
    WalletConnectMetadata,
    StacksChain,
    ConnectOptions,
} from './provider/stacks-wallet-provider.types';

// Constants
export {
    SUPPORTED_STACKS_WALLETS,
    type SupportedStacksWallet,
} from './constants/wallets';

// Utils
export { getNetworkFromAddress } from './utils/get-network-from-address';
export { getLocalStorageWallet } from './utils/get-local-storage-wallet';
export {
    getStacksWallets,
    type StacksWallets,
} from './utils/get-stacks-wallets';
