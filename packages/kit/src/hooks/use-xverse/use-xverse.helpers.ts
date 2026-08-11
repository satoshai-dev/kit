import { getSelectedProvider } from '@stacks/connect';

import { extractBitcoinPaymentAddress } from '../../provider/stacks-wallet-provider.helpers';

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
              publicKey?: string;
              addressType: string;
              purpose: string;
          }[]
        | undefined,
    currentAddress: string | undefined,
    currentPublicKey: string | undefined,
    onAccountChange: (account: {
        address: string;
        publicKey: string;
        btcAddress?: string;
        btcPublicKey?: string;
    }) => void,
    connect: () => Promise<void>
) => {
    if (!addresses || !Array.isArray(addresses)) {
        connect();
        return;
    }

    const stacksAccount = addresses.find(
        (acc) => acc.purpose === 'stacks' || acc.addressType === 'stacks'
    );

    if (!stacksAccount?.address || !stacksAccount.publicKey) {
        connect();
        return;
    }

    if (
        stacksAccount.address !== currentAddress ||
        stacksAccount.publicKey !== currentPublicKey
    ) {
        // The BTC payment address changes together with the Stacks account, so
        // resolve it here and hand it back alongside the Stacks values. Without
        // this, a wallet-side account switch would leave a stale BTC address
        // (same failure class as the stale publicKey fixed in #74).
        //
        // Reuse the shared extractor so this path applies the exact same rules
        // as connect/restore (payment entry, public key required) — otherwise
        // the same wallet payload could yield a BTC address here but not there.
        const btc = extractBitcoinPaymentAddress('xverse', addresses);

        onAccountChange({
            address: stacksAccount.address,
            publicKey: stacksAccount.publicKey,
            btcAddress: btc?.address,
            btcPublicKey: btc?.publicKey,
        });
    }
};
