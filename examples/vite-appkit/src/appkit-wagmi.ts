import { createAppKit } from '@reown/appkit/react';
import { bitcoin, mainnet } from '@reown/appkit/networks';
import { BitcoinAdapter } from '@reown/appkit-adapter-bitcoin';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { getStacksAppKitConfig } from '@satoshai/kit';

import { exposePairingUri } from './test-hooks';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string;

// EVM + Bitcoin + Stacks in one AppKit: the wagmi adapter is the default
// (active) namespace, as in apps that start on an EVM chain.
export const wagmiAdapter = new WagmiAdapter({ projectId, networks: [mainnet] });

const stacks = getStacksAppKitConfig(['mainnet']);

export const appKit = createAppKit({
    adapters: [wagmiAdapter, new BitcoinAdapter()],
    networks: [mainnet, bitcoin, ...stacks.networks],
    universalProviderConfigOverride: stacks.universalProviderConfigOverride,
    projectId,
    metadata: {
        name: '@satoshai/kit AppKit + wagmi example',
        description: 'EVM, Bitcoin and Stacks wallets through one AppKit',
        url: window.location.origin,
        icons: [],
    },
    features: { analytics: false, email: false, socials: false },
});

exposePairingUri(appKit);
