'use client';

import { request } from '@stacks/connect';
import { PostConditionMode } from '@stacks/transactions';
import { useCallback, useMemo, useState } from 'react';

import {
    BaseError,
    WalletNotConnectedError,
    UnsupportedMethodError,
    WalletRequestError,
} from '../../errors';
import type { MutationStatus } from '../../provider/stacks-wallet-provider.types';
import { useAddress } from '../use-address';
import { getNetworkFromAddress } from '../../utils/get-network-from-address';

import {
    resolveArgs,
    type ContractCallVariablesInternal,
} from '../use-write-contract/contract-call.shared';
import type {
    SponsoredContractCallOptions,
    SponsoredContractCallAsyncFn,
    SponsoredContractCallFn,
} from './use-sponsored-contract-call.types';

/**
 * Sign a sponsored contract call without broadcasting.
 *
 * The wallet signs the origin portion with `AuthType.Sponsored` (fee = 0)
 * and returns the signed transaction hex. The consumer sends this to a
 * sponsor service for co-signing and broadcast.
 *
 * @example
 * ```ts
 * import { PostConditionMode } from '@stacks/transactions';
 *
 * const { sponsoredContractCallAsync } = useSponsoredContractCall();
 *
 * // Untyped mode
 * const signedTx = await sponsoredContractCallAsync({
 *   address: 'SP...',
 *   contract: 'my-contract',
 *   functionName: 'deposit',
 *   args: [uintCV(100)],
 *   pc: { postConditions: [], mode: PostConditionMode.Deny },
 * });
 *
 * // Send to sponsor service
 * await fetch('/api/sponsor', { method: 'POST', body: signedTx });
 *
 * // Typed mode (with ABI — enables autocomplete)
 * const signedTx = await sponsoredContractCallAsync({
 *   abi: myContractAbi,
 *   address: 'SP...',
 *   contract: 'my-contract',
 *   functionName: 'deposit',
 *   args: { amount: 100n },
 *   pc: { postConditions: [], mode: PostConditionMode.Deny },
 * });
 * ```
 *
 * @throws {WalletNotConnectedError} If no wallet is connected.
 * @throws {UnsupportedMethodError} If the wallet does not support sponsored calls (OKX).
 * @throws {WalletRequestError} If the wallet rejects or fails the request.
 */
export const useSponsoredContractCall = () => {
    const { isConnected, address, provider } = useAddress();

    const [data, setData] = useState<string | undefined>(undefined);
    const [error, setError] = useState<BaseError | null>(null);
    const [status, setStatus] = useState<MutationStatus>('idle');

    const sponsoredContractCallAsync = useCallback(
        async (variables: ContractCallVariablesInternal): Promise<string> => {
            if (!isConnected || !address) {
                throw new WalletNotConnectedError();
            }

            if (provider === 'okx') {
                throw new UnsupportedMethodError({
                    method: 'stx_callContract (sponsored)',
                    wallet: 'OKX',
                });
            }

            setStatus('pending');
            setError(null);
            setData(undefined);

            const resolvedArgs = resolveArgs(variables);

            try {
                const response = await request('stx_callContract', {
                    address,
                    contract: `${variables.address}.${variables.contract}`,
                    functionName: variables.functionName,
                    functionArgs: resolvedArgs,
                    postConditions: variables.pc.postConditions,
                    postConditionMode:
                        variables.pc.mode === PostConditionMode.Allow
                            ? 'allow'
                            : 'deny',
                    network: getNetworkFromAddress(address),
                    sponsored: true,
                    fee: '0',
                });

                const signedTx = response.transaction;
                if (!signedTx) {
                    throw new Error('No signed transaction returned');
                }

                setData(signedTx);
                setStatus('success');
                return signedTx;
            } catch (err) {
                const error = err instanceof BaseError
                    ? err
                    : new WalletRequestError({
                          method: 'stx_callContract',
                          wallet: provider ?? 'unknown',
                          cause: err instanceof Error ? err : new Error(String(err)),
                      });
                setError(error);
                setStatus('error');
                throw error;
            }
        },
        [isConnected, address, provider]
    ) as unknown as SponsoredContractCallAsyncFn;

    const sponsoredContractCall = useCallback(
        (variables: ContractCallVariablesInternal, options?: SponsoredContractCallOptions) => {
            (sponsoredContractCallAsync as unknown as (v: ContractCallVariablesInternal) => Promise<string>)(variables)
                .then((data) => {
                    options?.onSuccess?.(data);
                    options?.onSettled?.(data, null);
                })
                .catch((error) => {
                    options?.onError?.(error);
                    options?.onSettled?.(undefined, error);
                });
        },
        [sponsoredContractCallAsync]
    ) as unknown as SponsoredContractCallFn;

    const reset = useCallback(() => {
        setData(undefined);
        setError(null);
        setStatus('idle');
    }, []);

    return useMemo(
        () => ({
            sponsoredContractCall,
            sponsoredContractCallAsync,
            reset,
            data,
            error,
            isError: status === 'error',
            isIdle: status === 'idle',
            isPending: status === 'pending',
            isSuccess: status === 'success',
            status,
        }),
        [sponsoredContractCall, sponsoredContractCallAsync, reset, data, error, status]
    );
};

export type {
    SponsoredContractCallVariables,
    SponsoredContractCallOptions,
    TypedSponsoredContractCallVariables,
    UntypedSponsoredContractCallVariables,
    SponsoredContractCallAsyncFn,
    SponsoredContractCallFn,
} from './use-sponsored-contract-call.types';
