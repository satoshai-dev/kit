import { createAppKit } from '@reown/appkit/react';
import { bitcoin } from '@reown/appkit/networks';
import { BitcoinAdapter } from '@reown/appkit-adapter-bitcoin';
import { getStacksAppKitConfig } from '@satoshai/kit';

import { exposePairingUri } from './test-hooks';

export const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string;

// One AppKit for the whole page: Bitcoin through its adapter, Stacks
// through the kit. The kit adds the Stacks networks and session methods.
const stacks = getStacksAppKitConfig(['mainnet']);

export const appKit = createAppKit({
    adapters: [new BitcoinAdapter()],
    networks: [bitcoin, ...stacks.networks],
    universalProviderConfigOverride: stacks.universalProviderConfigOverride,
    projectId,
    metadata: {
        name: '@satoshai/kit AppKit example',
        description: 'Stacks and Bitcoin wallets through one AppKit',
        url: window.location.origin,
        icons: [],
    },
    features: { analytics: false, email: false, socials: false },
});

exposePairingUri(appKit);
