'use client';

import { request } from '@stacks/connect';
import { useCallback, useMemo, useState } from 'react';

import {
    BaseError,
    WalletNotConnectedError,
    WalletNotFoundError,
    WalletRequestError,
} from '../errors';
import type { MutationStatus } from '../provider/stacks-wallet-provider.types';
import { useAddress } from './use-address';

/** Variables for {@link useSignMessage}. */
export interface SignMessageVariables {
    /** The plaintext message to sign. */
    message: string;
    /** Optional public key hint for wallets that manage multiple keys. */
    publicKey?: string;
}

/** Successful result from {@link useSignMessage}. */
export interface SignMessageData {
    /** The public key that produced the signature. */
    publicKey: string;
    /** The hex-encoded signature. */
    signature: string;
}

/** Callback options for the fire-and-forget `signMessage()` variant. */
export interface SignMessageOptions {
    onSuccess?: (data: SignMessageData) => void;
    onError?: (error: Error) => void;
    onSettled?: (
        data: SignMessageData | undefined,
        error: Error | null
    ) => void;
}

/**
 * Sign an arbitrary plaintext message with the connected wallet.
 *
 * Provides both a callback-style `signMessage()` and a promise-based
 * `signMessageAsync()`, plus mutation status flags.
 *
 * @example
 * ```ts
 * const { signMessageAsync, isPending } = useSignMessage();
 *
 * const { publicKey, signature } = await signMessageAsync({
 *   message: 'Hello Stacks',
 * });
 * ```
 *
 * @throws {WalletNotConnectedError} If no wallet is connected.
 * @throws {WalletNotFoundError} If OKX extension is not installed.
 * @throws {WalletRequestError} If the wallet rejects or fails the request.
 */
export const useSignMessage = () => {
    const { isConnected, provider } = useAddress();
    const [data, setData] = useState<SignMessageData | undefined>(undefined);
    const [error, setError] = useState<BaseError | null>(null);
    const [status, setStatus] = useState<MutationStatus>('idle');

    const signMessageAsync = useCallback(
        async (variables: SignMessageVariables): Promise<SignMessageData> => {
            if (!isConnected) {
                throw new WalletNotConnectedError();
            }

            setStatus('pending');
            setError(null);
            setData(undefined);

            try {
                let result: SignMessageData;

                if (provider === 'okx') {
                    if (!window.okxwallet) {
                        throw new WalletNotFoundError({ wallet: 'OKX' });
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
                const error = err instanceof BaseError
                    ? err
                    : new WalletRequestError({
                          method: 'stx_signMessage',
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
