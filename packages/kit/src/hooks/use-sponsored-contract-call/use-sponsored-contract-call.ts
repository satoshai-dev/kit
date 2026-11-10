'use client';

import { useMemo } from 'react';

import { useContractCallSigner } from '../use-sign-contract-call/use-sign-contract-call';

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
 * const typedSignedTx = await sponsoredContractCallAsync({
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
    const { sign, signAsync, reset, data, error, status } =
        useContractCallSigner(true);

    return useMemo(
        () => ({
            sponsoredContractCall: sign,
            sponsoredContractCallAsync: signAsync,
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

export type {
    SponsoredContractCallVariables,
    SponsoredContractCallOptions,
    TypedSponsoredContractCallVariables,
    UntypedSponsoredContractCallVariables,
    SponsoredContractCallAsyncFn,
    SponsoredContractCallFn,
} from './use-sponsored-contract-call.types';
