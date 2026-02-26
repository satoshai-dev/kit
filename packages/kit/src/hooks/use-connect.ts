'use client';

import { useCallback, useMemo, useState } from 'react';

import type { SupportedStacksWallet } from '../constants/wallets';
import type { ConnectOptions, MutationStatus } from '../provider/stacks-wallet-provider.types';
import { useStacksWalletContext } from '../provider/stacks-wallet-provider';

export const useConnect = () => {
    const {
        connect: contextConnect,
        reset: contextReset,
        status: walletStatus,
    } = useStacksWalletContext();

    const [error, setError] = useState<Error | null>(null);
    const [mutationStatus, setMutationStatus] =
        useState<MutationStatus>('idle');

    const connect = useCallback(
        async (
            providerId: SupportedStacksWallet,
            options?: ConnectOptions
        ) => {
            setError(null);
            setMutationStatus('pending');

            let settled = false;

            try {
                await contextConnect(providerId, {
                    onSuccess: (address, provider) => {
                        settled = true;
                        setMutationStatus('success');
                        options?.onSuccess?.(address, provider);
                    },
                    onError: (err) => {
                        settled = true;
                        setError(err);
                        setMutationStatus('error');
                        options?.onError?.(err);
                    },
                });
            } finally {
                if (!settled) {
                    // connect returned without calling onSuccess or onError
                    // (e.g., cancelled by reset or stale generation)
                    setMutationStatus('idle');
                }
            }
        },
        [contextConnect]
    );

    const reset = useCallback(() => {
        setError(null);
        setMutationStatus('idle');
        contextReset();
    }, [contextReset]);

    const value = useMemo(
        () => ({
            connect,
            reset,
            error,
            isError: mutationStatus === 'error',
            isIdle: mutationStatus === 'idle',
            isPending:
                mutationStatus === 'pending' ||
                walletStatus === 'connecting',
            isSuccess: mutationStatus === 'success',
            status: mutationStatus,
        }),
        [connect, reset, error, mutationStatus, walletStatus]
    );

    return value;
};
