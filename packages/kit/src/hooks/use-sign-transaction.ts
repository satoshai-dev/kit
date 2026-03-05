'use client';

import { request } from '@stacks/connect';
import { useCallback, useMemo, useState } from 'react';

import {
    BaseError,
    WalletNotConnectedError,
    UnsupportedMethodError,
    WalletRequestError,
} from '../errors';
import type { MutationStatus } from '../provider/stacks-wallet-provider.types';
import { useAddress } from './use-address';

export interface SignTransactionVariables {
    transaction: string;
    broadcast?: boolean;
}

export interface SignTransactionData {
    transaction: string;
    txid?: string;
}

export interface SignTransactionOptions {
    onSuccess?: (data: SignTransactionData) => void;
    onError?: (error: Error) => void;
    onSettled?: (
        data: SignTransactionData | undefined,
        error: Error | null
    ) => void;
}

export const useSignTransaction = () => {
    const { isConnected, provider } = useAddress();
    const [data, setData] = useState<SignTransactionData | undefined>(undefined);
    const [error, setError] = useState<BaseError | null>(null);
    const [status, setStatus] = useState<MutationStatus>('idle');

    const signTransactionAsync = useCallback(
        async (
            variables: SignTransactionVariables
        ): Promise<SignTransactionData> => {
            if (!isConnected) {
                throw new WalletNotConnectedError();
            }

            if (provider === 'okx') {
                throw new UnsupportedMethodError({
                    method: 'stx_signTransaction',
                    wallet: 'OKX',
                });
            }

            setStatus('pending');
            setError(null);
            setData(undefined);

            try {
                const result = await request('stx_signTransaction', {
                    transaction: variables.transaction,
                    ...(variables.broadcast !== undefined && {
                        broadcast: variables.broadcast,
                    }),
                });

                setData(result);
                setStatus('success');
                return result;
            } catch (err) {
                const error = err instanceof BaseError
                    ? err
                    : new WalletRequestError({
                          method: 'stx_signTransaction',
                          wallet: provider ?? 'unknown',
                          cause: err instanceof Error ? err : new Error(String(err)),
                      });
                setError(error);
                setStatus('error');
                throw error;
            }
        },
        [isConnected, provider]
    );

    const signTransaction = useCallback(
        (
            variables: SignTransactionVariables,
            options?: SignTransactionOptions
        ) => {
            signTransactionAsync(variables)
                .then((data) => {
                    options?.onSuccess?.(data);
                    options?.onSettled?.(data, null);
                })
                .catch((error) => {
                    options?.onError?.(error);
                    options?.onSettled?.(undefined, error);
                });
        },
        [signTransactionAsync]
    );

    const reset = useCallback(() => {
        setData(undefined);
        setError(null);
        setStatus('idle');
    }, []);

    return useMemo(
        () => ({
            signTransaction,
            signTransactionAsync,
            reset,
            data,
            error,
            isError: status === 'error',
            isIdle: status === 'idle',
            isPending: status === 'pending',
            isSuccess: status === 'success',
            status,
        }),
        [signTransaction, signTransactionAsync, reset, data, error, status]
    );
};
