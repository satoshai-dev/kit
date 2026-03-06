/**
 * Infer the Stacks network from an address prefix.
 *
 * @param address - A Stacks address starting with `SP`/`SM` (mainnet) or `ST`/`SN` (testnet).
 * @returns `'mainnet'` or `'testnet'`.
 * @throws If the address doesn't start with a known prefix.
 */
export const getNetworkFromAddress = (address: string) => {
    if (address.startsWith('SP') || address.startsWith('SM')) {
        return 'mainnet';
    }

    if (address.startsWith('ST') || address.startsWith('SN')) {
        return 'testnet';
    }

    throw new Error(`Invalid Stacks address: ${address}`);
};
