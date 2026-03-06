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
import { getNetworkFromAddress } from '../utils/get-network-from-address';

/** Variables for {@link useTransferSTX}. */
export interface TransferSTXVariables {
    /** Recipient Stacks address (`SP...` or `ST...`). */
    recipient: string;
    /** Amount in microSTX. Accepts `bigint`, `number`, or numeric `string`. */
    amount: bigint | number | string;
    /** Optional memo string attached to the transfer. */
    memo?: string;
    /** Custom fee in microSTX. Omit to let the wallet estimate. */
    fee?: bigint | number | string;
    /** Custom nonce. Omit to let the wallet manage. */
    nonce?: bigint | number | string;
}

/** Callback options for the fire-and-forget `transferSTX()` variant. */
export interface TransferSTXOptions {
    onSuccess?: (txid: string) => void;
    onError?: (error: Error) => void;
    onSettled?: (txid: string | undefined, error: Error | null) => void;
}

/**
 * Transfer native STX tokens to a recipient address.
 *
 * Returns the broadcast transaction ID on success. Supports all 6 wallets
 * (OKX uses its proprietary API internally).
 *
 * @example
 * ```ts
 * const { transferSTXAsync, isPending } = useTransferSTX();
 *
 * const txid = await transferSTXAsync({
 *   recipient: 'SP2...',
 *   amount: 1_000_000n, // 1 STX
 *   memo: 'coffee',
 * });
 * ```
 *
 * @throws {WalletNotConnectedError} If no wallet is connected.
 * @throws {WalletNotFoundError} If OKX extension is not installed.
 * @throws {WalletRequestError} If the wallet rejects or fails the request.
 */
export const useTransferSTX = () => {
    const { isConnected, address, provider } = useAddress();
    const [data, setData] = useState<string | undefined>(undefined);
    const [error, setError] = useState<BaseError | null>(null);
    const [status, setStatus] = useState<MutationStatus>('idle');

    const transferSTXAsync = useCallback(
        async (variables: TransferSTXVariables): Promise<string> => {
            if (!isConnected || !address) {
                throw new WalletNotConnectedError();
            }

            setStatus('pending');
            setError(null);
            setData(undefined);

            try {
                if (provider === 'okx') {
                    if (!window.okxwallet) {
                        throw new WalletNotFoundError({ wallet: 'OKX' });
                    }

                    const response =
                        await window.okxwallet.stacks.signTransaction({
                            txType: 'token_transfer',
                            recipient: variables.recipient,
                            amount: String(variables.amount),
                            memo: variables.memo ?? '',
                            stxAddress: address,
                            anchorMode: 3,
                        });

                    setData(response.txHash);
                    setStatus('success');
                    return response.txHash;
                }

                const response = await request('stx_transferStx', {
                    recipient: variables.recipient,
                    amount: variables.amount,
                    ...(variables.memo !== undefined && {
                        memo: variables.memo,
                    }),
                    ...(variables.fee !== undefined && {
                        fee: variables.fee,
                    }),
                    ...(variables.nonce !== undefined && {
                        nonce: variables.nonce,
                    }),
                    network: getNetworkFromAddress(address),
                });

                if (!response.txid) {
                    throw new Error('No transaction ID returned');
                }

                setData(response.txid);
                setStatus('success');
                return response.txid;
            } catch (err) {
                const error = err instanceof BaseError
                    ? err
                    : new WalletRequestError({
                          method: 'stx_transferStx',
                          wallet: provider ?? 'unknown',
                          cause: err instanceof Error ? err : new Error(String(err)),
                      });
                setError(error);
                setStatus('error');
                throw error;
            }
        },
        [isConnected, address, provider]
    );

    const transferSTX = useCallback(
        (variables: TransferSTXVariables, options?: TransferSTXOptions) => {
            transferSTXAsync(variables)
                .then((txid) => {
                    options?.onSuccess?.(txid);
                    options?.onSettled?.(txid, null);
                })
                .catch((error) => {
                    options?.onError?.(error);
                    options?.onSettled?.(undefined, error);
                });
        },
        [transferSTXAsync]
    );

    const reset = useCallback(() => {
        setData(undefined);
        setError(null);
        setStatus('idle');
    }, []);

    return useMemo(
        () => ({
            transferSTX,
            transferSTXAsync,
            reset,
            data,
            error,
            isError: status === 'error',
            isIdle: status === 'idle',
            isPending: status === 'pending',
            isSuccess: status === 'success',
            status,
        }),
        [transferSTX, transferSTXAsync, reset, data, error, status]
    );
};
