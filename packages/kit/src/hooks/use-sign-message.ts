'use client';

import { request } from '@stacks/connect';
import { useCallback, useMemo, useState } from 'react';

import type { MutationStatus } from '../provider/stacks-wallet-provider.types';
import { useAddress } from './use-address';

export interface SignMessageVariables {
    message: string;
    publicKey?: string;
}

export interface SignMessageData {
    publicKey: string;
    signature: string;
}

export interface SignMessageOptions {
    onSuccess?: (data: SignMessageData) => void;
    onError?: (error: Error) => void;
    onSettled?: (
        data: SignMessageData | undefined,
        error: Error | null
    ) => void;
}

export const useSignMessage = () => {
    const { isConnected, provider } = useAddress();
    const [data, setData] = useState<SignMessageData | undefined>(undefined);
    const [error, setError] = useState<Error | null>(null);
    const [status, setStatus] = useState<MutationStatus>('idle');

    const signMessageAsync = useCallback(
        async (variables: SignMessageVariables): Promise<SignMessageData> => {
            if (!isConnected) {
                throw new Error('Wallet is not connected');
            }

            setStatus('pending');
            setError(null);
            setData(undefined);

            try {
                let result: SignMessageData;

                if (provider === 'okx') {
                    if (!window.okxwallet) {
                        throw new Error('OKX wallet not found');
                    }

                    result = await window.okxwallet.stacks.signMessage({
                        message: variables.message,
                    });
                } else {
                    result = await request('stx_signMessage', {
                        message: variables.message,
                        ...(variables.publicKey && {
                            publicKey: variables.publicKey,
                        }),
                    });
                }

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

    const signMessage = useCallback(
        (variables: SignMessageVariables, options?: SignMessageOptions) => {
            signMessageAsync(variables)
                .then((data) => {
                    options?.onSuccess?.(data);
                    options?.onSettled?.(data, null);
                })
                .catch((error) => {
                    options?.onError?.(error);
                    options?.onSettled?.(undefined, error);
                });
        },
        [signMessageAsync]
    );

    const reset = useCallback(() => {
        setData(undefined);
        setError(null);
        setStatus('idle');
    }, []);

    return useMemo(
        () => ({
            signMessage,
            signMessageAsync,
            reset,
            data,
            error,
            isError: status === 'error',
            isIdle: status === 'idle',
            isPending: status === 'pending',
            isSuccess: status === 'success',
            status,
        }),
        [signMessage, signMessageAsync, reset, data, error, status]
    );
};
