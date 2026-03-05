'use client';

import { request } from '@stacks/connect';
import type { ClarityValue } from '@stacks/transactions';
import { PostConditionMode } from '@stacks/transactions';
import { useCallback, useMemo, useState } from 'react';

import {
    BaseError,
    WalletNotConnectedError,
    WalletNotFoundError,
    WalletRequestError,
} from '../../errors';
import type { MutationStatus } from '../../provider/stacks-wallet-provider.types';
import { useAddress } from '../use-address';
import { getNetworkFromAddress } from '../../utils/get-network-from-address';
import { namedArgsToClarityValues } from '../../utils/to-clarity-value';

import {
    preparePostConditionsForOKX,
    prepareArgsForOKX,
} from './use-write-contract.helpers';
import type {
    PostConditionConfig,
    WriteContractOptions,
    WriteContractAsyncFn,
    WriteContractFn,
} from './use-write-contract.types';

/** Loose internal ABI shape for runtime — avoids importing ClarityAbi which triggers deep instantiation. */
interface AbiLike {
    functions: readonly {
        name: string;
        access: string;
        args: readonly { name: string; type: unknown }[];
    }[];
}

/** Internal variables shape accepted at runtime (both typed and untyped). */
interface WriteContractVariablesInternal {
    abi?: AbiLike;
    address: string;
    contract: string;
    functionName: string;
    args: Record<string, unknown> | ClarityValue[];
    pc: PostConditionConfig;
}

/** Resolve args to ClarityValue[]: convert named args when ABI is present. */
function resolveArgs(variables: WriteContractVariablesInternal): ClarityValue[] {
    if (!variables.abi) {
        return variables.args as ClarityValue[];
    }

    const fn = variables.abi.functions.find(
        (f) => f.name === variables.functionName && f.access === 'public'
    );
    if (!fn) {
        throw new Error(
            `@satoshai/kit: Public function "${variables.functionName}" not found in ABI`
        );
    }

    return namedArgsToClarityValues(
        variables.args as Record<string, unknown>,
        fn.args
    );
}

export const useWriteContract = () => {
    const { isConnected, address, provider } = useAddress();

    const [data, setData] = useState<string | undefined>(undefined);
    const [error, setError] = useState<BaseError | null>(null);
    const [status, setStatus] = useState<MutationStatus>('idle');

    const writeContractAsync = useCallback(
        async (variables: WriteContractVariablesInternal): Promise<string> => {
            if (!isConnected || !address) {
                throw new WalletNotConnectedError();
            }

            setStatus('pending');
            setError(null);
            setData(undefined);

            const resolvedArgs = resolveArgs(variables);

            try {
                if (provider === 'okx') {
                    if (!window.okxwallet) {
                        throw new WalletNotFoundError({ wallet: 'OKX' });
                    }

                    const response =
                        await window.okxwallet.stacks.signTransaction({
                            contractAddress: variables.address,
                            contractName: variables.contract,
                            functionName: variables.functionName,
                            functionArgs: prepareArgsForOKX(resolvedArgs),
                            postConditions: preparePostConditionsForOKX(
                                variables.pc.postConditions
                            ),
                            postConditionMode: variables.pc.mode,
                            stxAddress: address,
                            txType: 'contract_call',
                            anchorMode: 3,
                        });

                    setData(response.txHash);
                    setStatus('success');
                    return response.txHash;
                }

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
    ) as unknown as WriteContractAsyncFn;

    const writeContract = useCallback(
        (variables: WriteContractVariablesInternal, options?: WriteContractOptions) => {
            (writeContractAsync as unknown as (v: WriteContractVariablesInternal) => Promise<string>)(variables)
                .then((data) => {
                    options?.onSuccess?.(data);
                    options?.onSettled?.(data, null);
                })
                .catch((error) => {
                    options?.onError?.(error);
                    options?.onSettled?.(undefined, error);
                });
        },
        [writeContractAsync]
    ) as unknown as WriteContractFn;

    const reset = useCallback(() => {
        setData(undefined);
        setError(null);
        setStatus('idle');
    }, []);

    return useMemo(
        () => ({
            writeContract,
            writeContractAsync,
            reset,
            data,
            error,
            isError: status === 'error',
            isIdle: status === 'idle',
            isPending: status === 'pending',
            isSuccess: status === 'success',
            status,
        }),
        [writeContract, writeContractAsync, reset, data, error, status]
    );
};

export type {
    WriteContractVariables,
    WriteContractOptions,
    PostConditionConfig,
    TypedWriteContractVariables,
    UntypedWriteContractVariables,
    WriteContractAsyncFn,
    WriteContractFn,
} from './use-write-contract.types';
