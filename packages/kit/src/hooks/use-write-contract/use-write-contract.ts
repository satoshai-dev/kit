'use client';

import { request } from '@stacks/connect';
import { PostConditionMode } from '@stacks/transactions';
import { useCallback, useState } from 'react';

import { useAddress } from '../use-address';
import { getNetworkFromAddress } from '../../utils/get-network-from-address';

import {
    preparePostConditionsForOKX,
    prepareArgsForOKX,
} from './use-write-contract.helpers';
import type {
    WriteContractVariables,
    WriteContractOptions,
} from './use-write-contract.types';

export const useWriteContract = () => {
    const { isConnected, address, provider } = useAddress();

    const [data, setData] = useState<string | undefined>(undefined);
    const [error, setError] = useState<Error | null>(null);
    const [isPending, setIsPending] = useState(false);

    const writeContractAsync = useCallback(
        async (variables: WriteContractVariables): Promise<string> => {
            if (!isConnected || !address) {
                throw new Error('Wallet is not connected');
            }

            setIsPending(true);
            setError(null);
            setData(undefined);

            try {
                if (provider === 'okx') {
                    if (!window.okxwallet) {
                        throw new Error('OKX wallet not found');
                    }

                    const response =
                        await window.okxwallet.stacks.signTransaction({
                            contractAddress: variables.address,
                            contractName: variables.contract,
                            functionName: variables.functionName,
                            functionArgs: prepareArgsForOKX(variables.args),
                            postConditions: preparePostConditionsForOKX(
                                variables.pc.postConditions
                            ),
                            postConditionMode: variables.pc.mode,
                            stxAddress: address,
                            txType: 'contract_call',
                            anchorMode: 3,
                        });

                    setData(response.txHash);
                    setIsPending(false);
                    return response.txHash;
                }

                const response = await request('stx_callContract', {
                    address,
                    contract: `${variables.address}.${variables.contract}`,
                    functionName: variables.functionName,
                    functionArgs: variables.args,
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
                setIsPending(false);
                return response.txid;
            } catch (err) {
                const error =
                    err instanceof Error ? err : new Error(String(err));
                setError(error);
                setIsPending(false);
                throw error;
            }
        },
        [isConnected, address, provider]
    );

    const writeContract = useCallback(
        (variables: WriteContractVariables, options?: WriteContractOptions) => {
            writeContractAsync(variables)
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
    );

    return {
        writeContract,
        writeContractAsync,
        data,
        error,
        isPending,
    };
};

export type {
    WriteContractVariables,
    WriteContractOptions,
    PostConditionConfig,
} from './use-write-contract.types';
