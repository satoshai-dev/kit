import { useEffect } from 'react';
import { clearSelectedProviderId } from '@stacks/connect';

import type { SupportedStacksWallet } from '../../constants/wallets';
import {
    getWcUniversalProvider,
    extractStacksAddress,
    pingSession,
} from './use-wallet-connect.helpers';

export const useWalletConnect = ({
    address,
    provider,
    onAddressChange,
    onDisconnect,
}: {
    address: string | undefined;
    provider: SupportedStacksWallet | undefined;
    onAddressChange: (newAddress: string) => void;
    onDisconnect: () => void;
}) => {
    // On restore: validate the session is still alive
    useEffect(() => {
        if (provider !== 'wallet-connect' || !address) return;

        let cancelled = false;

        const validateSession = async () => {
            const alive = await pingSession();
            if (cancelled) return;
            if (!alive) {
                const wcProvider = getWcUniversalProvider();
                try {
                    await wcProvider?.disconnect();
                } catch {
                    // Provider may already be cleaned up
                }
                clearSelectedProviderId();
                onDisconnect();
            }
        };

        void validateSession();

        return () => {
            cancelled = true;
        };
    }, [provider, address, onDisconnect]);

    // Listen for wallet-initiated disconnect and account changes
    useEffect(() => {
        if (provider !== 'wallet-connect' || !address) return;

        const wcProvider = getWcUniversalProvider();
        if (!wcProvider) return;

        const handleDisconnect = () => {
            clearSelectedProviderId();
            onDisconnect();
        };

        const handleAccountsChanged = (...args: unknown[]) => {
            const accounts = args[0] as (import('./use-wallet-connect.types').StxAccount | string)[];
            const newAddress = extractStacksAddress(accounts);
            if (newAddress && newAddress !== address) {
                onAddressChange(newAddress);
            }
        };

        wcProvider.on('disconnect', handleDisconnect);
        wcProvider.on('accountsChanged', handleAccountsChanged);
        wcProvider.on('stx_accountChange', handleAccountsChanged);
        wcProvider.on('stx_accountsChanged', handleAccountsChanged);

        return () => {
            try {
                wcProvider.off('disconnect', handleDisconnect);
                wcProvider.off('accountsChanged', handleAccountsChanged);
                wcProvider.off('stx_accountChange', handleAccountsChanged);
                wcProvider.off('stx_accountsChanged', handleAccountsChanged);
            } catch (error) {
                console.error(
                    'Failed to remove WalletConnect listeners:',
                    error
                );
            }
        };
    }, [address, provider, onAddressChange, onDisconnect]);
};
