import type {
    ClarityValue,
    PostCondition,
    PostConditionMode,
} from '@stacks/transactions';
import type {
    ClarityAbi,
    ExtractAbiFunctionNames,
} from 'clarity-abitype';

import type { PublicFunctionArgs } from '../../types/abi';

/** Post-condition configuration for contract calls and STX transfers. */
export interface PostConditionConfig {
    /** Array of post-conditions that must be satisfied for the transaction to succeed. */
    postConditions: PostCondition[];
    /** Whether to allow or deny any asset transfers not covered by `postConditions`. */
    mode: PostConditionMode;
}

/** Typed mode: ABI present, args is a named object with autocomplete. */
export interface TypedWriteContractVariables<
    TAbi extends ClarityAbi,
    TFn extends ExtractAbiFunctionNames<TAbi, 'public'>,
> {
    abi: TAbi;
    address: string;
    contract: string;
    functionName: TFn;
    args: PublicFunctionArgs<TAbi, TFn>;
    pc: PostConditionConfig;
}

/** Untyped mode: no ABI, args is ClarityValue[] (original behavior). */
export interface UntypedWriteContractVariables {
    address: string;
    contract: string;
    functionName: string;
    args: ClarityValue[];
    pc: PostConditionConfig;
}

/** Backward-compatible alias for the untyped variant. */
export type WriteContractVariables = UntypedWriteContractVariables;

/** Callback options for the fire-and-forget `writeContract()` variant. */
export interface WriteContractOptions {
    onSuccess?: (txHash: string) => void;
    onError?: (error: Error) => void;
    onSettled?: (txHash: string | undefined, error: Error | null) => void;
}

/** Overloaded async function: typed mode (with ABI) or untyped mode. */
export interface WriteContractAsyncFn {
    <
        const TAbi extends ClarityAbi,
        TFn extends ExtractAbiFunctionNames<TAbi, 'public'>,
    >(
        variables: TypedWriteContractVariables<TAbi, TFn>
    ): Promise<string>;
    (variables: UntypedWriteContractVariables): Promise<string>;
}

/** Overloaded fire-and-forget function: typed mode or untyped mode. */
export interface WriteContractFn {
    <
        const TAbi extends ClarityAbi,
        TFn extends ExtractAbiFunctionNames<TAbi, 'public'>,
    >(
        variables: TypedWriteContractVariables<TAbi, TFn>,
        options?: WriteContractOptions
    ): void;
    (
        variables: UntypedWriteContractVariables,
        options?: WriteContractOptions
    ): void;
}
