import type {
    ClarityValue,
    PostCondition,
    PostConditionMode,
} from '@stacks/transactions';

export interface PostConditionConfig {
    postConditions: PostCondition[];
    mode: PostConditionMode;
}

export interface WriteContractVariables {
    address: string;
    contract: string;
    functionName: string;
    args: ClarityValue[];
    pc: PostConditionConfig;
}

export interface WriteContractOptions {
    onSuccess?: (txHash: string) => void;
    onError?: (error: Error) => void;
    onSettled?: (txHash: string | undefined, error: Error | null) => void;
}
