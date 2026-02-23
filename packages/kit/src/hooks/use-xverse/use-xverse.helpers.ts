import { getSelectedProvider } from '@stacks/connect';

export const getXverseProductInfo = async (): Promise<{
    version?: string;
    name?: string;
} | null> =>
    (await window.XverseProviders?.StacksProvider?.getProductInfo?.()) ?? null;

export const shouldSupportAccountChange = (
    version: string | undefined
): boolean => version !== undefined && version !== '1.0.0';

export const waitForXverseProvider = async (
    maxAttempts = 10,
    initialDelay = 200
): Promise<boolean> => {
    for (let i = 0; i < maxAttempts; i++) {
        const provider = getSelectedProvider();

        if (provider?.request && provider?.addListener) return true;

        await new Promise((resolve) =>
            setTimeout(resolve, initialDelay * Math.min(i + 1, 5))
        );
    }

    return false;
};

export const extractAndValidateStacksAddress = (
    addresses:
        | {
              address: string;
              addressType: string;
              purpose: string;
          }[]
        | undefined,
    currentAddress: string | undefined,
    onAddressChange: (address: string) => void,
    connect: () => Promise<void>
) => {
    if (!addresses || !Array.isArray(addresses)) {
        void connect();
        return;
    }

    const stacksAccount = addresses.find(
        (acc) => acc.purpose === 'stacks' || acc.addressType === 'stacks'
    );

    if (!stacksAccount?.address) {
        void connect();
        return;
    }

    if (stacksAccount.address !== currentAddress) {
        onAddressChange(stacksAccount.address);
    }
};
