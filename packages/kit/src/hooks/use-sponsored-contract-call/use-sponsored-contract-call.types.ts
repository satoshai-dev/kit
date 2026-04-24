import type { ClarityValue } from '@stacks/transactions';
import type {
    ClarityAbi,
    ExtractAbiFunctionNames,
} from 'clarity-abitype';

import type { PublicFunctionArgs } from '../../types/abi';
import type { PostConditionConfig } from '../use-write-contract/use-write-contract.types';

/** Typed mode: ABI present, args is a named object with autocomplete. */
export interface TypedSponsoredContractCallVariables<
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

/** Untyped mode: no ABI, args is ClarityValue[]. */
export interface UntypedSponsoredContractCallVariables {
    address: string;
    contract: string;
    functionName: string;
    args: ClarityValue[];
    pc: PostConditionConfig;
}

/** Backward-compatible alias for the untyped variant. */
export type SponsoredContractCallVariables = UntypedSponsoredContractCallVariables;

/** Callback options for the fire-and-forget `sponsoredContractCall()` variant. */
export interface SponsoredContractCallOptions {
    onSuccess?: (signedTx: string) => void;
    onError?: (error: Error) => void;
    onSettled?: (signedTx: string | undefined, error: Error | null) => void;
}

/** Overloaded async function: typed mode (with ABI) or untyped mode. */
export interface SponsoredContractCallAsyncFn {
    <
        const TAbi extends ClarityAbi,
        TFn extends ExtractAbiFunctionNames<TAbi, 'public'>,
    >(
        variables: TypedSponsoredContractCallVariables<TAbi, TFn>
    ): Promise<string>;
    (variables: UntypedSponsoredContractCallVariables): Promise<string>;
}

/** Overloaded fire-and-forget function: typed mode or untyped mode. */
export interface SponsoredContractCallFn {
    <
        const TAbi extends ClarityAbi,
        TFn extends ExtractAbiFunctionNames<TAbi, 'public'>,
    >(
        variables: TypedSponsoredContractCallVariables<TAbi, TFn>,
        options?: SponsoredContractCallOptions
    ): void;
    (
        variables: UntypedSponsoredContractCallVariables,
        options?: SponsoredContractCallOptions
    ): void;
}
