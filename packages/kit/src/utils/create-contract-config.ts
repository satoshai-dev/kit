import type { ClarityAbi } from 'clarity-abitype';

/** Pre-bind ABI + address + contract for reuse with useWriteContract. */
export function createContractConfig<const TAbi extends ClarityAbi>(config: {
    abi: TAbi;
    address: string;
    contract: string;
}) {
    return config;
}
