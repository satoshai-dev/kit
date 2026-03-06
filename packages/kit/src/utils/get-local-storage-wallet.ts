import { LOCAL_STORAGE_STACKS } from '../constants/storage-keys';
import type { SupportedStacksWallet } from '../constants/wallets';
import { SUPPORTED_STACKS_WALLETS } from '../constants/wallets';

/**
 * Read the persisted wallet session from localStorage.
 *
 * Returns `null` on the server, when no session is stored, or when the
 * stored provider is not in the supported wallets list.
 */
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
