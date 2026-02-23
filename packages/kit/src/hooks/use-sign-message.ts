'use client';

import { request } from '@stacks/connect';
import { useCallback, useState } from 'react';

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
    const [isPending, setIsPending] = useState(false);

    const signMessageAsync = useCallback(
        async (variables: SignMessageVariables): Promise<SignMessageData> => {
            if (!isConnected) {
                throw new Error('Wallet is not connected');
            }

            setIsPending(true);
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
                setIsPending(false);
                return result;
            } catch (err) {
                const error =
                    err instanceof Error ? err : new Error(String(err));
                setError(error);
                setIsPending(false);
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

    return {
        signMessage,
        signMessageAsync,
        data,
        error,
        isPending,
    };
};
