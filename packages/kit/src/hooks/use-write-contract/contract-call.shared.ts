import type { ClarityValue } from '@stacks/transactions';

import { namedArgsToClarityValues } from '../../utils/to-clarity-value';

import type { PostConditionConfig } from './use-write-contract.types';

/** Loose internal ABI shape for runtime — avoids importing ClarityAbi which triggers deep instantiation. */
export interface AbiLike {
    functions: readonly {
        name: string;
        access: string;
        args: readonly { name: string; type: unknown }[];
    }[];
}

/** Internal variables shape accepted at runtime (both typed and untyped). */
export interface ContractCallVariablesInternal {
    abi?: AbiLike;
    address: string;
    contract: string;
    functionName: string;
    args: Record<string, unknown> | ClarityValue[];
    pc: PostConditionConfig;
}

/** Resolve args to ClarityValue[]: convert named args when ABI is present. */
export function resolveArgs(variables: ContractCallVariablesInternal): ClarityValue[] {
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
