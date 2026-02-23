import type { SupportedStacksWallet } from '../constants/wallets';
import type {
    WalletConnectMetadata,
    StacksChain,
} from './stacks-wallet-provider.types';
import { WalletConnect } from '@stacks/connect';

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
