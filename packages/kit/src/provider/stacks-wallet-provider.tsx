'use client';

import {
    clearSelectedProviderId,
    getSelectedProviderId,
    setSelectedProviderId,
    request,
    getSelectedProvider,
    DEFAULT_PROVIDERS,
    WALLET_CONNECT_PROVIDER,
    WalletConnect,
} from '@stacks/connect';
import {
    createContext,
    useContext,
    useCallback,
    useEffect,
    useRef,
    useState,
    useMemo,
} from 'react';

import {
    STACKS_TO_STACKS_CONNECT_PROVIDERS,
    STACKS_CONNECT_TO_STACKS_PROVIDERS,
} from '../constants/stacks-provider-mapping';
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
    registerOkxProvider,
    unregisterOkxProvider,
    OKX_PROVIDER_META,
} from './stacks-wallet-provider.helpers';
import type {
    WalletContextValue,
    WalletState,
    ConnectOptions,
    StacksWalletProviderProps,
} from './stacks-wallet-provider.types';
import { useXverse } from '../hooks/use-xverse/use-xverse';
import { getLocalStorageWallet } from '../utils/get-local-storage-wallet';

// Static lookup — built once at module load from @stacks/connect metadata
const PROVIDER_META_BY_KIT_ID = Object.fromEntries(
    [...DEFAULT_PROVIDERS, WALLET_CONNECT_PROVIDER, OKX_PROVIDER_META].map(
        (p) => [
            STACKS_CONNECT_TO_STACKS_PROVIDERS[p.id],
            { name: p.name, icon: p.icon ?? '', webUrl: p.webUrl ?? '' },
        ]
    )
) as Record<string, { name: string; icon: string; webUrl: string }>;

const StacksWalletContext = createContext<WalletContextValue | undefined>(
    undefined
);

export const StacksWalletProvider = ({
    children,
    wallets,
    connectModal = true,
    walletConnect,
    onConnect,
    onAddressChange,
    onDisconnect,
}: StacksWalletProviderProps) => {
    const [address, setAddress] = useState<string | undefined>();
    const [provider, setProvider] = useState<
        SupportedStacksWallet | undefined
    >();
    const [isConnecting, setIsConnecting] = useState(false);

    // Generation counter — incremented by reset() to invalidate in-flight connect promises
    const connectGenRef = useRef(0);

    // Track whether the wallet was previously connected so we only fire
    // onConnect on the initial disconnected → connected transition (#23)
    const wasConnectedRef = useRef(false);

    // Guard against concurrent WalletConnect.initializeProvider calls
    const wcInitRef = useRef<Promise<void> | null>(null);

    // Keep walletConnect in a ref so the connect callback always reads the
    // latest config without needing the object in its dependency array
    // (inline walletConnect={{ projectId: '...' }} would cause a new ref
    // each render, recreating connect on every render).
    const walletConnectRef = useRef(walletConnect);
    walletConnectRef.current = walletConnect;

    // Serialize wallets to a stable string for use as a dependency,
    // so inline arrays like wallets={['xverse', 'leather']} don't
    // invalidate memos on every render. (Fixes #5)
    const walletsKey = wallets?.join(',');

    // Validate in render body so React error boundaries can catch it (#21)
    if (wallets?.includes('wallet-connect') && !walletConnect?.projectId) {
        throw new Error(
            'StacksWalletProvider: "wallet-connect" is listed in wallets but no walletConnect.projectId was provided.'
        );
    }

    // Register the OKX WBIP adapter so it appears in the @stacks/connect modal.
    // Only when connectModal is enabled and OKX is in the configured wallets
    // (or wallets is undefined, meaning all wallets are configured).
    useEffect(() => {
        const okxConfigured = !wallets || wallets.includes('okx');
        if (connectModal && okxConfigured) {
            registerOkxProvider();
            return () => unregisterOkxProvider();
        }
    }, [connectModal, walletsKey]);

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
                    const initPromise = WalletConnect.initializeProvider(
                        buildWalletConnectConfig(
                            walletConnect.projectId,
                            walletConnect.metadata,
                            walletConnect.chains
                        )
                    );
                    wcInitRef.current = initPromise;
                    await initPromise;
                    wcInitRef.current = null;
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
        async (
            providerId?: SupportedStacksWallet,
            options?: ConnectOptions
        ) => {
            // --- Modal branch: delegate wallet selection to @stacks/connect ---
            if (connectModal && !providerId) {
                const gen = ++connectGenRef.current;
                setIsConnecting(true);

                try {
                    clearSelectedProviderId();

                    const requestOptions: Parameters<typeof request>[0] = {
                        forceWalletSelect: true,
                        // OKX at the end so it appears last among installed wallets
                        defaultProviders: [
                            ...DEFAULT_PROVIDERS,
                            OKX_PROVIDER_META,
                        ],
                    };

                    if (wallets) {
                        requestOptions.approvedProviderIds = wallets.map(
                            (w) => STACKS_TO_STACKS_CONNECT_PROVIDERS[w]
                        );
                    }

                    const wc = walletConnectRef.current;
                    if (wc?.projectId) {
                        requestOptions.walletConnect =
                            buildWalletConnectConfig(
                                wc.projectId,
                                wc.metadata,
                                wc.chains
                            );
                    }

                    const data = await request(
                        requestOptions,
                        'getAddresses',
                        {}
                    );

                    if (connectGenRef.current !== gen) return;

                    const selectedId = getSelectedProviderId();
                    const resolvedProvider = selectedId
                        ? STACKS_CONNECT_TO_STACKS_PROVIDERS[selectedId]
                        : undefined;

                    if (!resolvedProvider) {
                        throw new Error(
                            `Unknown provider returned from @stacks/connect modal: ${selectedId ?? 'none'}`
                        );
                    }

                    const extractedAddress = extractStacksAddress(
                        resolvedProvider,
                        data.addresses
                    );

                    setAddress(extractedAddress);
                    setProvider(resolvedProvider);
                    options?.onSuccess?.(extractedAddress, resolvedProvider);
                } catch (error) {
                    if (connectGenRef.current !== gen) return;
                    console.error('Failed to connect wallet:', error);
                    getSelectedProvider()?.disconnect?.();
                    clearSelectedProviderId();
                    options?.onError?.(error as Error);
                } finally {
                    if (connectGenRef.current === gen) {
                        setIsConnecting(false);
                    }
                }
                return;
            }

            // --- Explicit provider branch (existing behavior) ---
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

            const wc = walletConnectRef.current;

            if (
                typedProvider === 'wallet-connect' &&
                !wc?.projectId
            ) {
                const error = new Error(
                    'WalletConnect requires a project ID. Please provide walletConnect.projectId to the StacksWalletProvider.'
                );
                console.error('🚨', error.message);
                options?.onError?.(error);
                return;
            }

            // Capture generation so we can detect if reset() was called during await
            const gen = ++connectGenRef.current;
            setIsConnecting(true);

            try {
                if (typedProvider === 'okx') {
                    const data = await getOKXStacksAddress();
                    if (connectGenRef.current !== gen) return;
                    setAddress(data.address);
                    setProvider(data.provider);
                    options?.onSuccess?.(data.address, data.provider);
                    return;
                }

                setSelectedProviderId(
                    STACKS_TO_STACKS_CONNECT_PROVIDERS[typedProvider]
                );

                const wcConfig =
                    typedProvider === 'wallet-connect' && wc
                        ? buildWalletConnectConfig(
                              wc.projectId,
                              wc.metadata,
                              wc.chains
                          )
                        : undefined;

                if (wcConfig) {
                    // Wait for any in-flight init, then start ours
                    if (wcInitRef.current) await wcInitRef.current;
                    const initPromise =
                        WalletConnect.initializeProvider(wcConfig);
                    wcInitRef.current = initPromise;
                    await initPromise;
                    wcInitRef.current = null;
                }

                if (connectGenRef.current !== gen) return;

                const data = wcConfig
                    ? await request(
                          { walletConnect: wcConfig },
                          'getAddresses',
                          {}
                      )
                    : await request('getAddresses');

                if (connectGenRef.current !== gen) return;

                const extractedAddress = extractStacksAddress(
                    typedProvider,
                    data.addresses
                );

                setAddress(extractedAddress);
                setProvider(typedProvider);
                options?.onSuccess?.(extractedAddress, typedProvider);
            } catch (error) {
                if (connectGenRef.current !== gen) return;
                console.error('Failed to connect wallet:', error);
                // OKX uses its own SDK and never calls setSelectedProviderId,
                // so getSelectedProvider() would return the previously connected
                // provider — disconnecting the wrong wallet.
                if (typedProvider !== 'okx') {
                    getSelectedProvider()?.disconnect?.();
                    clearSelectedProviderId();
                }
                options?.onError?.(error as Error);
            } finally {
                if (connectGenRef.current === gen) {
                    setIsConnecting(false);
                }
            }
        },
        [connectModal, walletsKey]
    );

    const reset = useCallback(() => {
        connectGenRef.current++;
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
        const isConnected = !!address && !!provider;

        if (isConnected && !wasConnectedRef.current) {
            onConnect?.(provider, address);
        }

        wasConnectedRef.current = isConnected;
    }, [address, provider, onConnect]);

    const handleAddressChange = useCallback(
        (newAddress: string) => {
            setAddress(newAddress);
            onAddressChange?.(newAddress);
        },
        [onAddressChange]
    );

    useXverse({
        address,
        provider,
        onAddressChange: handleAddressChange,
        connect,
    });

    // Computed in render body (not memoized) so it picks up wallet extensions
    // injected after hydration. The context value useMemo below uses
    // walletInfosKey so the reference stays stable when nothing changes.
    const { installed } = getStacksWallets();
    const configured = wallets ?? [...SUPPORTED_STACKS_WALLETS];
    const walletInfos = configured.map((w) => ({
        id: w,
        name: PROVIDER_META_BY_KIT_ID[w]?.name ?? w,
        icon: PROVIDER_META_BY_KIT_ID[w]?.icon ?? '',
        webUrl: PROVIDER_META_BY_KIT_ID[w]?.webUrl ?? '',
        available:
            w === 'wallet-connect'
                ? !!walletConnect?.projectId
                : installed.includes(w),
    }));

    // Serialize for stable dependency — only changes when the actual data changes
    const walletInfosKey = walletInfos
        .map((w) => `${w.id}:${w.available}`)
        .join(',');

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
    }, [address, provider, isConnecting, connect, disconnect, reset, walletInfosKey]);

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
