export const getNetworkFromAddress = (address: string) => {
    if (address.startsWith('SP') || address.startsWith('SM')) {
        return 'mainnet';
    }

    if (address.startsWith('ST') || address.startsWith('SN')) {
        return 'testnet';
    }

    throw new Error(`Invalid Stacks address: ${address}`);
};
