'use client';

import { request } from '@stacks/connect';
import type { ClarityValue, TupleCV } from '@stacks/transactions';
import { useCallback, useMemo, useState } from 'react';

import type { MutationStatus } from '../provider/stacks-wallet-provider.types';
import { useAddress } from './use-address';

export interface SignStructuredMessageVariables {
    message: ClarityValue;
    domain: TupleCV;
}

export interface SignStructuredMessageData {
    publicKey: string;
    signature: string;
}

export interface SignStructuredMessageOptions {
    onSuccess?: (data: SignStructuredMessageData) => void;
    onError?: (error: Error) => void;
    onSettled?: (
        data: SignStructuredMessageData | undefined,
        error: Error | null
    ) => void;
}

export const useSignStructuredMessage = () => {
    const { isConnected, provider } = useAddress();
    const [data, setData] = useState<SignStructuredMessageData | undefined>(
        undefined
    );
    const [error, setError] = useState<Error | null>(null);
    const [status, setStatus] = useState<MutationStatus>('idle');

    const signStructuredMessageAsync = useCallback(
        async (
            variables: SignStructuredMessageVariables
        ): Promise<SignStructuredMessageData> => {
            if (!isConnected) {
                throw new Error('Wallet is not connected');
            }

            if (provider === 'okx') {
                throw new Error(
                    'Structured message signing is not supported by OKX wallet'
                );
            }

            setStatus('pending');
            setError(null);
            setData(undefined);

            try {
                const result = await request('stx_signStructuredMessage', {
                    message: variables.message,
                    domain: variables.domain,
                });

                setData(result);
                setStatus('success');
                return result;
            } catch (err) {
                const error =
                    err instanceof Error ? err : new Error(String(err));
                setError(error);
                setStatus('error');
                throw error;
            }
        },
        [isConnected, provider]
    );

    const signStructuredMessage = useCallback(
        (
            variables: SignStructuredMessageVariables,
            options?: SignStructuredMessageOptions
        ) => {
            signStructuredMessageAsync(variables)
                .then((data) => {
                    options?.onSuccess?.(data);
                    options?.onSettled?.(data, null);
                })
                .catch((error) => {
                    options?.onError?.(error);
                    options?.onSettled?.(undefined, error);
                });
        },
        [signStructuredMessageAsync]
    );

    const reset = useCallback(() => {
        setData(undefined);
        setError(null);
        setStatus('idle');
    }, []);

    return useMemo(
        () => ({
            signStructuredMessage,
            signStructuredMessageAsync,
            reset,
            data,
            error,
            isError: status === 'error',
            isIdle: status === 'idle',
            isPending: status === 'pending',
            isSuccess: status === 'success',
            status,
        }),
        [
            signStructuredMessage,
            signStructuredMessageAsync,
            reset,
            data,
            error,
            status,
        ]
    );
};
