import { LOCAL_STORAGE_STACKS } from '../constants/storage-keys';
import type { SupportedStacksWallet } from '../constants/wallets';
import { SUPPORTED_STACKS_WALLETS } from '../constants/wallets';

export const getLocalStorageWallet = (): {
    address: string;
    provider: SupportedStacksWallet;
} | null => {
    if (typeof window === 'undefined') return null;

    const stored = localStorage.getItem(LOCAL_STORAGE_STACKS);

    if (!stored) return null;

    try {
        const data = JSON.parse(stored) as {
            address: string;
            provider: SupportedStacksWallet;
        };

        const isValid = SUPPORTED_STACKS_WALLETS.find(
            (wallet) => wallet === data.provider
        );

        return isValid ? data : null;
    } catch {
        return null;
    }
};
