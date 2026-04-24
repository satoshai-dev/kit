// Errors
export {
    BaseError,
    type BaseErrorType,
    WalletNotConnectedError,
    type WalletNotConnectedErrorType,
    WalletNotFoundError,
    type WalletNotFoundErrorType,
    UnsupportedMethodError,
    type UnsupportedMethodErrorType,
    WalletRequestError,
    type WalletRequestErrorType,
} from './errors';

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
    useSignStructuredMessage,
    type SignStructuredMessageVariables,
    type SignStructuredMessageData,
    type SignStructuredMessageOptions,
} from './hooks/use-sign-structured-message';
export {
    useSignTransaction,
    type SignTransactionVariables,
    type SignTransactionData,
    type SignTransactionOptions,
} from './hooks/use-sign-transaction';
export {
    useTransferSTX,
    type TransferSTXVariables,
    type TransferSTXOptions,
} from './hooks/use-transfer-stx';
export {
    useWriteContract,
    type WriteContractVariables,
    type WriteContractOptions,
    type PostConditionConfig,
    type TypedWriteContractVariables,
    type UntypedWriteContractVariables,
} from './hooks/use-write-contract/use-write-contract';
export {
    useSponsoredContractCall,
    type SponsoredContractCallVariables,
    type SponsoredContractCallOptions,
    type TypedSponsoredContractCallVariables,
    type UntypedSponsoredContractCallVariables,
} from './hooks/use-sponsored-contract-call/use-sponsored-contract-call';
export { useBnsName } from './hooks/use-bns-name';
export { useWallets } from './hooks/use-wallets';

// Types
export type {
    WalletState,
    WalletContextValue,
    WalletConnectMetadata,
    WalletInfo,
    StacksChain,
    ConnectOptions,
    MutationStatus,
} from './provider/stacks-wallet-provider.types';

export type {
    TraitReference,
    PublicFunctionName,
    PublicFunctionArgs,
} from './types/abi';

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
export { createContractConfig } from './utils/create-contract-config';

// Re-export ClarityAbi for convenience
export type { ClarityAbi } from 'clarity-abitype';
