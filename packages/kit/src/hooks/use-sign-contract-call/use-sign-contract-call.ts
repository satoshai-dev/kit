'use client';

import { request } from '@stacks/connect';
import {
    makeUnsignedContractCall,
    serializeTransaction,
} from '@stacks/transactions';
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
} from '../use-sponsored-contract-call/use-sponsored-contract-call.types';

/**
 * Shared builder for the sign-only hooks. Builds the unsigned contract call in
 * the app and asks the wallet only to sign it (`stx_signTransaction`,
 * `broadcast: false`). Sponsored calls carry fee 0; standard calls let
 * `@stacks/transactions` fetch the fee estimate and nonce.
 */
export const useContractCallSigner = (sponsored: boolean) => {
    const { isConnected, address, publicKey, provider } = useAddress();

    const [data, setData] = useState<string | undefined>(undefined);
    const [error, setError] = useState<BaseError | null>(null);
    const [status, setStatus] = useState<MutationStatus>('idle');

    const signAsync = useCallback(
        async (variables: ContractCallVariablesInternal): Promise<string> => {
            if (!isConnected || !address) {
                throw new WalletNotConnectedError();
            }

            if (provider === 'okx') {
                throw new UnsupportedMethodError({
                    method: sponsored
                        ? 'stx_callContract (sponsored)'
                        : 'stx_signTransaction',
                    wallet: 'OKX',
                });
            }

            if (!publicKey) {
                throw new BaseError(
                    sponsored
                        ? 'Public key not available — cannot build sponsored transaction'
                        : 'Public key not available — cannot build the transaction'
                );
            }

            setStatus('pending');
            setError(null);
            setData(undefined);

            const resolvedArgs = resolveArgs(variables);

            try {
                const unsignedTx = await makeUnsignedContractCall({
                    contractAddress: variables.address,
                    contractName: variables.contract,
                    functionName: variables.functionName,
                    functionArgs: resolvedArgs,
                    publicKey,
                    ...(sponsored ? { sponsored: true, fee: 0 } : {}),
                    postConditions: variables.pc.postConditions,
                    postConditionMode: variables.pc.mode,
                    network: getNetworkFromAddress(address),
                });

                const result = await request('stx_signTransaction', {
                    transaction: serializeTransaction(unsignedTx),
                    broadcast: false,
                });

                const signedTx = result.transaction;
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
                          method: 'stx_signTransaction',
                          wallet: provider ?? 'unknown',
                          cause: err instanceof Error ? err : new Error(String(err)),
                      });
                setError(error);
                setStatus('error');
                throw error;
            }
        },
        [isConnected, address, publicKey, provider, sponsored]
    ) as unknown as SponsoredContractCallAsyncFn;

    const sign = useCallback(
        (variables: ContractCallVariablesInternal, options?: SponsoredContractCallOptions) => {
            (signAsync as unknown as (v: ContractCallVariablesInternal) => Promise<string>)(variables)
                .then((data) => {
                    options?.onSuccess?.(data);
                    options?.onSettled?.(data, null);
                })
                .catch((error) => {
                    options?.onError?.(error);
                    options?.onSettled?.(undefined, error);
                });
        },
        [signAsync]
    ) as unknown as SponsoredContractCallFn;

    const reset = useCallback(() => {
        setData(undefined);
        setError(null);
        setStatus('idle');
    }, []);

    return { sign, signAsync, reset, data, error, status };
};

/**
 * Sign a standard (user-paid) contract call without broadcasting.
 *
 * The app builds the transaction, so any post-condition mode that
 * `@stacks/transactions` supports reaches the wallet unchanged (for example
 * `PostConditionMode.Originator`, SIP-040). Returns the signed transaction
 * hex for the consumer to broadcast or relay.
 *
 * @example
 * ```ts
 * const { signContractCallAsync } = useSignContractCall();
 *
 * const signedTx = await signContractCallAsync({
 *   address: 'SP...',
 *   contract: 'my-contract',
 *   functionName: 'deposit',
 *   args: [uintCV(100)],
 *   pc: { postConditions, mode: PostConditionMode.Originator },
 * });
 * ```
 *
 * @throws {WalletNotConnectedError} If no wallet is connected.
 * @throws {UnsupportedMethodError} If the wallet cannot sign a prebuilt transaction (OKX).
 * @throws {WalletRequestError} If the wallet rejects or fails the request.
 */
export const useSignContractCall = () => {
    const { sign, signAsync, reset, data, error, status } =
        useContractCallSigner(false);

    return useMemo(
        () => ({
            signContractCall: sign,
            signContractCallAsync: signAsync,
            reset,
            data,
            error,
            isError: status === 'error',
            isIdle: status === 'idle',
            isPending: status === 'pending',
            isSuccess: status === 'success',
            status,
        }),
        [sign, signAsync, reset, data, error, status]
    );
};
