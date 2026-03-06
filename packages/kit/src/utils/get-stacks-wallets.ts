import {
    SUPPORTED_STACKS_WALLETS,
    type SupportedStacksWallet,
} from '../constants/wallets';

/** Result of {@link getStacksWallets}. */
export interface StacksWallets {
    /** All wallets supported by `@satoshai/kit`. */
    supported: SupportedStacksWallet[];
    /** Subset of `supported` whose browser extension is currently detected. */
    installed: SupportedStacksWallet[];
}

/**
 * Detect which Stacks wallets are supported and installed.
 *
 * Safe to call on the server — `installed` will contain only `'wallet-connect'`
 * when `window` is undefined.
 */
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
    if (typeof window === 'undefined') return wallet === 'wallet-connect';

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
