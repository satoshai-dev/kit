import { useEffect } from 'react';
import { clearSelectedProviderId } from '@stacks/connect';

import type { SupportedStacksWallet } from '../../constants/wallets';
import type { WcAccountsChangedEvent } from './use-wallet-connect.types';
import {
    getWcUniversalProvider,
    extractStacksAddressFromCaip10,
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
            if (!cancelled && !alive) {
                const wcProvider = getWcUniversalProvider();
                try {
                    await wcProvider?.disconnect();
                } catch {
                    // Ignore — provider may already be cleaned up
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

        const handleAccountsChanged = (accounts: WcAccountsChangedEvent) => {
            const newAddress = extractStacksAddressFromCaip10(accounts);
            if (newAddress && newAddress !== address) {
                onAddressChange(newAddress);
            }
        };

        wcProvider.on('disconnect', handleDisconnect);
        wcProvider.on('accountsChanged', handleAccountsChanged);

        return () => {
            try {
                wcProvider.off('disconnect', handleDisconnect);
                wcProvider.off('accountsChanged', handleAccountsChanged);
            } catch (error) {
                console.error(
                    'Failed to remove WalletConnect listeners:',
                    error
                );
            }
        };
    }, [address, provider, onAddressChange, onDisconnect]);
};
