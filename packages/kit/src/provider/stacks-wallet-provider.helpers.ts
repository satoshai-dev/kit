import type { SupportedStacksWallet } from '../constants/wallets';
import type { WbipProvider } from '@stacks/connect';
import type {
    WalletConnectMetadata,
    StacksChain,
} from './stacks-wallet-provider.types';
import { WalletConnect } from '@stacks/connect';
import { OKX_PROVIDER_ID } from '../constants/stacks-provider-mapping';

const STACKS_CHAIN_MAPPING = {
    mainnet: WalletConnect.Chains.Stacks.Mainnet,
    testnet: WalletConnect.Chains.Stacks.Testnet,
} as const;

export const buildWalletConnectConfig = (
    projectId: string,
    metadata?: Partial<WalletConnectMetadata>,
    chains?: StacksChain[]
): {
    projectId: string;
    metadata: WalletConnectMetadata;
    networks: (typeof WalletConnect.Networks.Stacks)[];
} => {
    const selectedChains = chains ?? ['mainnet'];
    const walletConnectChains = selectedChains.map(
        (chain) => STACKS_CHAIN_MAPPING[chain]
    );

    return {
        projectId,
        metadata: {
            name: 'Universal Connector',
            description: 'Universal Connector',
            url: 'https://appkit.reown.com',
            icons: ['https://appkit.reown.com/icon.png'],
            ...metadata,
        },
        networks: [
            {
                ...WalletConnect.Networks.Stacks,
                chains: walletConnectChains,
            },
        ],
    };
};

export const getOKXStacksAddress = async () => {
    if (!window.okxwallet) {
        throw new Error('🚨 OKX Wallet is not installed');
    }

    const stacksResponse = await window.okxwallet.stacks.connect();

    if (!stacksResponse) {
        throw new Error('🚨 Failed to connect with OKX Wallet');
    }

    return {
        address: stacksResponse.address,
        provider: 'okx' as const,
    };
};

/**
 * OKX WBIP adapter — registers a minimal provider on `window` so OKX appears
 * in @stacks/connect's wallet selection modal. Only `getAddresses` is handled;
 * after connection, the kit routes all subsequent calls (signMessage,
 * callContract, etc.) through `window.okxwallet.stacks` directly.
 */
const OKX_PROVIDER_META: WbipProvider = {
    id: OKX_PROVIDER_ID,
    name: 'OKX Wallet',
    icon: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiICAgICB4bWxuczp4b2RtPSJodHRwOi8vd3d3LmNvcmVsLmNvbS9jb3JlbGRyYXcvb2RtLzIwMDMiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMjUwMCAyNTAwIiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAyNTAwIDI1MDA7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KICAgIC5zdDB7ZmlsbC1ydWxlOmV2ZW5vZGQ7Y2xpcC1ydWxlOmV2ZW5vZGQ7fQogICAgLnN0MXtmaWxsOiNGRkZGRkY7fQo8L3N0eWxlPgo8ZyBpZD0iTGF5ZXJfeDAwMjBfMSI+CiAgICA8ZyBpZD0iXzIxODczODEzMjM4NTYiPgogICAgICAgIDxyZWN0IHk9IjAiIGNsYXNzPSJzdDAiIHdpZHRoPSIyNTAwIiBoZWlnaHQ9IjI1MDAiPjwvcmVjdD4KICAgICAgICA8Zz4KICAgICAgICAgICAgPHBhdGggY2xhc3M9InN0MSIgZD0iTTE0NjMsMTAxNWgtNDA0Yy0xNywwLTMxLDE0LTMxLDMxdjQwNGMwLDE3LDE0LDMxLDMxLDMxaDQwNGMxNywwLDMxLTE0LDMxLTMxdi00MDQgICAgIEMxNDk0LDEwMjksMTQ4MCwxMDE1LDE0NjMsMTAxNXoiPjwvcGF0aD4KICAgICAgICAgICAgPHBhdGggY2xhc3M9InN0MSIgZD0iTTk5Niw1NDlINTkyYy0xNywwLTMxLDE0LTMxLDMxdjQwNGMwLDE3LDE0LDMxLDMxLDMxaDQwNGMxNywwLDMxLTE0LDMxLTMxVjU4MEMxMDI3LDU2MywxMDEzLDU0OSw5OTYsNTQ5eiI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBjbGFzcz0ic3QxIiBkPSJNMTkzMCw1NDloLTQwNGMtMTcsMC0zMSwxNC0zMSwzMXY0MDRjMCwxNywxNCwzMSwzMSwzMWg0MDRjMTcsMCwzMS0xNCwzMS0zMVY1ODAgICAgIEMxOTYxLDU2MywxOTQ3LDU0OSwxOTMwLDU0OXoiPjwvcGF0aD4KICAgICAgICAgICAgPHBhdGggY2xhc3M9InN0MSIgZD0iTTk5NiwxNDgySDU5MmMtMTcsMC0zMSwxNC0zMSwzMXY0MDRjMCwxNywxNCwzMSwzMSwzMWg0MDRjMTcsMCwzMS0xNCwzMS0zMXYtNDA0ICAgICBDMTAyNywxNDk2LDEwMTMsMTQ4Miw5OTYsMTQ4MnoiPjwvcGF0aD4KICAgICAgICAgICAgPHBhdGggY2xhc3M9InN0MSIgZD0iTTE5MzAsMTQ4MmgtNDA0Yy0xNywwLTMxLDE0LTMxLDMxdjQwNGMwLDE3LDE0LDMxLDMxLDMxaDQwNGMxNywwLDMxLTE0LDMxLTMxdi00MDQgICAgIEMxOTYxLDE0OTYsMTk0NywxNDgyLDE5MzAsMTQ4MnoiPjwvcGF0aD4KICAgICAgICA8L2c+CiAgICA8L2c+CjwvZz4KPC9zdmc+',
    webUrl: 'https://www.okx.com/',
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export const registerOkxProvider = () => {
    if (typeof window === 'undefined') return;

    // Mount a minimal WBIP adapter at window[OKX_PROVIDER_ID].
    // Only getAddresses is needed — after connection the kit routes
    // signMessage / callContract through window.okxwallet.stacks directly.
    if (!(window as any)[OKX_PROVIDER_ID]) {
        (window as any)[OKX_PROVIDER_ID] = {
            request: async (method: string) => {
                if (method === 'getAddresses') {
                    const data = await getOKXStacksAddress();
                    return {
                        result: {
                            addresses: [
                                { address: data.address, symbol: 'STX' },
                            ],
                        },
                    };
                }
                throw new Error(
                    `OKX adapter: unsupported method "${method}". Use connect('okx') for direct OKX SDK access.`
                );
            },
        };
    }

    // Register in WBIP004 global so @stacks/connect discovers it
    if (!Array.isArray((window as any).wbip_providers)) {
        (window as any).wbip_providers = [];
    }
    const providers = (window as any).wbip_providers as WbipProvider[];
    if (!providers.some((p) => p.id === OKX_PROVIDER_ID)) {
        providers.push(OKX_PROVIDER_META);
    }
};

export const unregisterOkxProvider = () => {
    if (typeof window === 'undefined') return;

    delete (window as any)[OKX_PROVIDER_ID];

    const providers = (window as any).wbip_providers as
        | WbipProvider[]
        | undefined;
    if (Array.isArray(providers)) {
        const idx = providers.findIndex((p) => p.id === OKX_PROVIDER_ID);
        if (idx !== -1) providers.splice(idx, 1);
    }
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export const extractStacksAddress = (
    typedProvider: SupportedStacksWallet,
    addresses: { address?: string; symbol?: string }[]
) => {
    if (!addresses.length) {
        throw new Error(`No addresses provided for ${typedProvider} wallet`);
    }

    if (typedProvider === 'leather' || typedProvider === 'asigna') {
        const stxAddress = addresses.find(
            (addr) => addr.symbol === 'STX'
        )?.address;

        if (stxAddress) return stxAddress;
    }

    const stacksAddress = addresses.find((addr) =>
        addr.address?.startsWith('S')
    )?.address;

    if (stacksAddress) return stacksAddress;

    const legacyAddress = addresses[2]?.address;

    if (legacyAddress?.startsWith('S')) return legacyAddress;

    throw new Error(
        `No valid Stacks address found for ${typedProvider} wallet`
    );
};
