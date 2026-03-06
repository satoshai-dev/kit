'use client';

import { useCallback, useMemo, useState } from 'react';

import type { MutationStatus } from '../provider/stacks-wallet-provider.types';
import { useStacksWalletContext } from '../provider/stacks-wallet-provider';

/**
 * Disconnect the currently connected wallet.
 *
 * Clears wallet state, removes the persisted session from localStorage,
 * and resets the provider context back to `disconnected`.
 *
 * @example
 * ```ts
 * const { disconnect, isSuccess } = useDisconnect();
 *
 * disconnect();
 * disconnect(() => navigate('/'));
 * ```
 */
export const useDisconnect = () => {
    const { disconnect: contextDisconnect } = useStacksWalletContext();

    const [error, setError] = useState<Error | null>(null);
    const [mutationStatus, setMutationStatus] =
        useState<MutationStatus>('idle');

    const disconnect = useCallback(
        (callback?: () => void) => {
            setError(null);

            try {
                contextDisconnect(callback);
                setMutationStatus('success');
            } catch (err) {
                const normalizedError =
                    err instanceof Error ? err : new Error(String(err));
                setError(normalizedError);
                setMutationStatus('error');
            }
        },
        [contextDisconnect]
    );

    const reset = useCallback(() => {
        setError(null);
        setMutationStatus('idle');
    }, []);

    const value = useMemo(
        () => ({
            disconnect,
            reset,
            error,
            isError: mutationStatus === 'error',
            isIdle: mutationStatus === 'idle',
            isPending: mutationStatus === 'pending',
            isSuccess: mutationStatus === 'success',
            status: mutationStatus,
        }),
        [disconnect, reset, error, mutationStatus]
    );

    return value;
};
