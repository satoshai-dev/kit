import {
    SUPPORTED_STACKS_WALLETS,
    type SupportedStacksWallet,
} from '../constants/wallets';

export interface StacksWallets {
    supported: SupportedStacksWallet[];
    installed: SupportedStacksWallet[];
}

export const getStacksWallets = (): StacksWallets => {
    const supported = [...SUPPORTED_STACKS_WALLETS];
    const installed = supported.filter((wallet) =>
        checkIfStacksProviderIsInstalled(wallet)
    );

    return { supported, installed };
};

export const checkIfStacksProviderIsInstalled = (
    wallet: SupportedStacksWallet
): boolean => {
    if (typeof window === 'undefined') return true;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    switch (wallet) {
        case 'xverse':
            return !!(window as any).XverseProviders;
        case 'leather':
            return (
                !!(window as any).LeatherProvider ||
                !!(window as any).HiroWalletProvider
            );
        case 'asigna':
            return !!(window as any).AsignaProvider;
        case 'okx':
            return !!(window as any).okxwallet;
        case 'fordefi':
            return !!(window as any).FordefiProviders?.UtxoProvider;
        case 'wallet-connect':
            return true;
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
};
