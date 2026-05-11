import { getSelectedProvider } from '@stacks/connect';
import { useEffect, useRef, useState } from 'react';

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
    publicKey,
    provider,
    onAccountChange,
    connect,
}: {
    address: string | undefined;
    publicKey: string | undefined;
    provider: SupportedStacksWallet | undefined;
    onAccountChange: (address: string, publicKey: string) => void;
    connect: (
        providerId?: SupportedStacksWallet,
        options?: ConnectOptions
    ) => Promise<void>;
}) => {
    const [isProviderReady, setIsProviderReady] = useState(false);

    // Mirror current address/publicKey into refs so the accountChange listener
    // always compares against the latest values without re-mounting the effect.
    // Keeping them in the dep array tore down and re-ran the setup on every
    // account switch, which called wallet_connect a second time and prompted
    // Xverse for re-authorization.
    const addressRef = useRef(address);
    const publicKeyRef = useRef(publicKey);
    useEffect(() => {
        addressRef.current = address;
        publicKeyRef.current = publicKey;
    }, [address, publicKey]);

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

    // Re-run on connect/disconnect (hasAddress flip), not on account switches.
    const hasAddress = !!address;

    useEffect(() => {
        if (provider !== 'xverse' || !hasAddress || !isProviderReady) return;

        let cancelled = false;
        let removeListener: (() => void) | undefined;

        const setupXverse = async () => {
            try {
                const productInfo = await getXverseProductInfo();

                if (cancelled) return;

                if (!shouldSupportAccountChange(productInfo?.version)) return;

                const response = await getSelectedProvider()?.request(
                    'wallet_connect',
                    null
                );

                if (cancelled) return;

                extractAndValidateStacksAddress(
                    response?.result?.addresses,
                    addressRef.current,
                    publicKeyRef.current,
                    onAccountChange,
                    () => connect('xverse')
                );

                removeListener = getSelectedProvider()?.addListener(
                    'accountChange',
                    (event: XverseAccountChangeEvent) => {
                        extractAndValidateStacksAddress(
                            event?.addresses,
                            addressRef.current,
                            publicKeyRef.current,
                            onAccountChange,
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
            cancelled = true;

            if (!removeListener) return;

            try {
                removeListener();
            } catch (error) {
                console.error('Failed to remove Xverse listener:', error);
            }
        };
    }, [hasAddress, isProviderReady, onAccountChange, connect, provider]);
};
