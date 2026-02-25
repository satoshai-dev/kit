'use client';

import {
    clearSelectedProviderId,
    setSelectedProviderId,
    request,
    getSelectedProvider,
    WalletConnect,
} from '@stacks/connect';
import {
    createContext,
    useContext,
    useCallback,
    useEffect,
    useState,
    useMemo,
} from 'react';

import { STACKS_TO_STACKS_CONNECT_PROVIDERS } from '../constants/stacks-provider-mapping';
import { LOCAL_STORAGE_STACKS } from '../constants/storage-keys';
import type { SupportedStacksWallet } from '../constants/wallets';
import { SUPPORTED_STACKS_WALLETS } from '../constants/wallets';
import {
    checkIfStacksProviderIsInstalled,
    getStacksWallets,
} from '../utils/get-stacks-wallets';

import {
    getOKXStacksAddress,
    extractStacksAddress,
    buildWalletConnectConfig,
} from './stacks-wallet-provider.helpers';
import type {
    WalletContextValue,
    WalletState,
    ConnectOptions,
    StacksWalletProviderProps,
} from './stacks-wallet-provider.types';
import { useXverse } from '../hooks/use-xverse/use-xverse';
import { getLocalStorageWallet } from '../utils/get-local-storage-wallet';

const StacksWalletContext = createContext<WalletContextValue | undefined>(
    undefined
);

export const StacksWalletProvider = ({
    children,
    wallets,
    walletConnect,
    onConnect,
    onAddressChange,
    onDisconnect,
}: StacksWalletProviderProps) => {
    if (wallets?.includes('wallet-connect') && !walletConnect?.projectId) {
        throw new Error(
            'StacksWalletProvider: "wallet-connect" is listed in wallets but no walletConnect.projectId was provided.'
        );
    }

    const [address, setAddress] = useState<string | undefined>();
    const [provider, setProvider] = useState<
        SupportedStacksWallet | undefined
    >();
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        const loadPersistedWallet = async () => {
            const persisted = getLocalStorageWallet();

            if (!persisted) return;

            setIsConnecting(true);

            try {
                if (persisted.provider === 'okx') {
                    const data = await getOKXStacksAddress();
                    setAddress(data.address);
                    setProvider(data.provider);
                    return;
                }

                if (
                    persisted.provider === 'wallet-connect' &&
                    walletConnect?.projectId
                ) {
                    await WalletConnect.initializeProvider(
                        buildWalletConnectConfig(
                            walletConnect.projectId,
                            walletConnect.metadata,
                            walletConnect.chains
                        )
                    );
                }

                setAddress(persisted.address);
                setProvider(persisted.provider);
                setSelectedProviderId(
                    STACKS_TO_STACKS_CONNECT_PROVIDERS[persisted.provider]
                );
            } catch (error) {
                console.error('Failed to restore wallet connection:', error);
            } finally {
                setIsConnecting(false);
            }
        };

        void loadPersistedWallet();
    }, [walletConnect?.projectId]);

    const connect = useCallback(
        async (providerId: SupportedStacksWallet, options?: ConnectOptions) => {
            const typedProvider = SUPPORTED_STACKS_WALLETS.find(
                (wallet) => wallet === providerId
            );

            if (!typedProvider) {
                const error = new Error(
                    'The wallet provider selected is not supported!'
                );
                console.error('🚨', error.message);
                options?.onError?.(error);
                return;
            }

            if (!checkIfStacksProviderIsInstalled(typedProvider)) {
                const error = new Error(
                    `${typedProvider} wallet is not installed. Please install the wallet extension to continue.`
                );
                console.error('🚨', error.message);
                options?.onError?.(error);
                return;
            }

            if (
                typedProvider === 'wallet-connect' &&
                !walletConnect?.projectId
            ) {
                const error = new Error(
                    'WalletConnect requires a project ID. Please provide walletConnect.projectId to the StacksWalletProvider.'
                );
                console.error('🚨', error.message);
                options?.onError?.(error);
                return;
            }

            setIsConnecting(true);

            try {
                if (typedProvider === 'okx') {
                    const data = await getOKXStacksAddress();
                    setAddress(data.address);
                    setProvider(data.provider);
                    options?.onSuccess?.(data.address, data.provider);
                    return;
                }

                setSelectedProviderId(
                    STACKS_TO_STACKS_CONNECT_PROVIDERS[typedProvider]
                );

                const wcConfig =
                    typedProvider === 'wallet-connect' && walletConnect
                        ? buildWalletConnectConfig(
                              walletConnect.projectId,
                              walletConnect.metadata,
                              walletConnect.chains
                          )
                        : undefined;

                if (wcConfig) {
                    await WalletConnect.initializeProvider(wcConfig);
                }

                const data = wcConfig
                    ? await request(
                          { walletConnect: wcConfig },
                          'getAddresses',
                          {}
                      )
                    : await request('getAddresses');

                const extractedAddress = extractStacksAddress(
                    typedProvider,
                    data.addresses
                );

                setAddress(extractedAddress);
                setProvider(typedProvider);
                options?.onSuccess?.(extractedAddress, typedProvider);
            } catch (error) {
                console.error('Failed to connect wallet:', error);
                getSelectedProvider()?.disconnect?.();
                clearSelectedProviderId();
                options?.onError?.(error as Error);
            } finally {
                setIsConnecting(false);
            }
        },
        [walletConnect]
    );

    const reset = useCallback(() => {
        setIsConnecting(false);
        clearSelectedProviderId();
    }, []);

    const disconnect = useCallback(
        (callback?: () => void) => {
            localStorage.removeItem(LOCAL_STORAGE_STACKS);
            setAddress(undefined);
            setProvider(undefined);
            getSelectedProvider()?.disconnect?.();
            clearSelectedProviderId();
            callback?.();
            onDisconnect?.();
        },
        [onDisconnect]
    );

    useEffect(() => {
        if (!address || !provider) return;

        localStorage.setItem(
            LOCAL_STORAGE_STACKS,
            JSON.stringify({ address, provider })
        );
    }, [address, provider]);

    useEffect(() => {
        if (!address || !provider || !onConnect) return;

        onConnect(provider, address);
    }, [address, provider, onConnect]);

    useXverse({
        address,
        provider,
        onAddressChange: (newAddress: string) => {
            setAddress(newAddress);
            onAddressChange?.(newAddress);
        },
        connect,
    });

    const walletInfos = useMemo(() => {
        const { installed } = getStacksWallets();
        const configured = wallets ?? [...SUPPORTED_STACKS_WALLETS];

        return configured.map((w) => ({
            id: w,
            available:
                w === 'wallet-connect'
                    ? !!walletConnect?.projectId
                    : installed.includes(w),
        }));
    }, [wallets, walletConnect?.projectId]);

    const value = useMemo((): WalletContextValue => {
        const walletState: WalletState = isConnecting
            ? { status: 'connecting', address: undefined, provider: undefined }
            : address && provider
            ? { status: 'connected', address, provider }
            : {
                  status: 'disconnected',
                  address: undefined,
                  provider: undefined,
              };

        return {
            ...walletState,
            connect,
            disconnect,
            reset,
            wallets: walletInfos,
        };
    }, [address, provider, isConnecting, connect, disconnect, reset, walletInfos]);

    return (
        <StacksWalletContext.Provider value={value}>
            {children}
        </StacksWalletContext.Provider>
    );
};

export const useStacksWalletContext = () => {
    const context = useContext(StacksWalletContext);

    if (context === undefined) {
        throw new Error(
            '🚨 Stacks wallet hooks must be used within StacksWalletProvider'
        );
    }

    return context;
};
