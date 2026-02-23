import { getSelectedProvider } from '@stacks/connect';
import { useEffect, useState } from 'react';

import type { SupportedStacksWallet } from '../../constants/wallets';
import type { ConnectOptions } from '../../provider/stacks-wallet-provider.types';
import type { XverseAccountChangeEvent } from './use-xverse.types';
import {
    extractAndValidateStacksAddress,
    getXverseProductInfo,
    shouldSupportAccountChange,
    waitForXverseProvider,
} from './use-xverse.helpers';

export const useXverse = ({
    address,
    provider,
    onAddressChange,
    connect,
}: {
    address: string | undefined;
    provider: SupportedStacksWallet | undefined;
    onAddressChange: (newAddress: string) => void;
    connect: (
        providerId: SupportedStacksWallet,
        options?: ConnectOptions
    ) => Promise<void>;
}) => {
    const [isProviderReady, setIsProviderReady] = useState(false);

    useEffect(() => {
        if (provider !== 'xverse') return;

        const checkProvider = async () => {
            const ready = await waitForXverseProvider();

            setIsProviderReady(ready);

            if (!ready) {
                console.error('Xverse provider failed to initialize');
            }
        };

        void checkProvider();
    }, [provider]);

    useEffect(() => {
        if (provider !== 'xverse' || !address || !isProviderReady) return;

        let removeListener: (() => void) | undefined;

        const setupXverse = async () => {
            try {
                const productInfo = await getXverseProductInfo();

                if (!shouldSupportAccountChange(productInfo?.version)) return;

                const response = await getSelectedProvider()?.request(
                    'wallet_connect',
                    null
                );

                extractAndValidateStacksAddress(
                    response?.result?.addresses,
                    address,
                    onAddressChange,
                    () => connect('xverse')
                );

                removeListener = getSelectedProvider()?.addListener(
                    'accountChange',
                    (event: XverseAccountChangeEvent) => {
                        extractAndValidateStacksAddress(
                            event?.addresses,
                            address,
                            onAddressChange,
                            () => connect('xverse')
                        );
                    }
                );
            } catch (error) {
                console.error('Failed to setup Xverse:', error);
            }
        };

        void setupXverse();

        return () => {
            if (!removeListener) return;

            try {
                removeListener();
            } catch (error) {
                console.error('Failed to remove Xverse listener:', error);
            }
        };
    }, [address, isProviderReady, onAddressChange, connect, provider]);
};
