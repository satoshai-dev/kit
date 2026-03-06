import type { ClarityAbi } from 'clarity-abitype';

/**
 * Pre-bind ABI, address, and contract name for reuse with `useWriteContract`.
 *
 * Returns the config object as-is but preserves the `const` ABI type, enabling
 * autocomplete on `functionName` and type-checked `args` when spread into
 * `writeContract()`.
 *
 * @example
 * ```ts
 * const pool = createContractConfig({
 *   abi: poolAbi,
 *   address: 'SP...',
 *   contract: 'pool-v1',
 * });
 *
 * writeContract({ ...pool, functionName: 'deposit', args: { amount: 100n }, pc });
 * ```
 */
export function createContractConfig<const TAbi extends ClarityAbi>(config: {
    abi: TAbi;
    address: string;
    contract: string;
}) {
    return config;
}
