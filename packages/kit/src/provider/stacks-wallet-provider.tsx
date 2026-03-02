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

    // Fix #1: runtime guard in useEffect instead of render body
    useEffect(() => {
        if (wallets?.includes('wallet-connect') && !walletConnect?.projectId) {
            throw new Error(
                'StacksWalletProvider: "wallet-connect" is listed in wallets but no walletConnect.projectId was provided.'
            );
        }
    }, [walletsKey, walletConnect?.projectId]);

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

    // Static lookup — DEFAULT_PROVIDERS / WALLET_CONNECT_PROVIDER never change at runtime
    const providerMetaByKitId = useMemo(() => {
        const connectProviders = [
            ...DEFAULT_PROVIDERS,
            WALLET_CONNECT_PROVIDER,
        ];
        const meta: Record<
            string,
            { name: string; icon: string; webUrl: string }
        > = Object.fromEntries(
            connectProviders.map((p) => [
                STACKS_CONNECT_TO_STACKS_PROVIDERS[p.id],
                { name: p.name, icon: p.icon ?? '', webUrl: p.webUrl ?? '' },
            ])
        );
        // OKX uses its own SDK and isn't in @stacks/connect's provider list
        meta['okx'] = {
            name: 'OKX Wallet',
            icon: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiICAgICB4bWxuczp4b2RtPSJodHRwOi8vd3d3LmNvcmVsLmNvbS9jb3JlbGRyYXcvb2RtLzIwMDMiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMjUwMCAyNTAwIiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAyNTAwIDI1MDA7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KICAgIC5zdDB7ZmlsbC1ydWxlOmV2ZW5vZGQ7Y2xpcC1ydWxlOmV2ZW5vZGQ7fQogICAgLnN0MXtmaWxsOiNGRkZGRkY7fQo8L3N0eWxlPgo8ZyBpZD0iTGF5ZXJfeDAwMjBfMSI+CiAgICA8ZyBpZD0iXzIxODczODEzMjM4NTYiPgogICAgICAgIDxyZWN0IHk9IjAiIGNsYXNzPSJzdDAiIHdpZHRoPSIyNTAwIiBoZWlnaHQ9IjI1MDAiPjwvcmVjdD4KICAgICAgICA8Zz4KICAgICAgICAgICAgPHBhdGggY2xhc3M9InN0MSIgZD0iTTE0NjMsMTAxNWgtNDA0Yy0xNywwLTMxLDE0LTMxLDMxdjQwNGMwLDE3LDE0LDMxLDMxLDMxaDQwNGMxNywwLDMxLTE0LDMxLTMxdi00MDQgICAgIEMxNDk0LDEwMjksMTQ4MCwxMDE1LDE0NjMsMTAxNXoiPjwvcGF0aD4KICAgICAgICAgICAgPHBhdGggY2xhc3M9InN0MSIgZD0iTTk5Niw1NDlINTkyYy0xNywwLTMxLDE0LTMxLDMxdjQwNGMwLDE3LDE0LDMxLDMxLDMxaDQwNGMxNywwLDMxLTE0LDMxLTMxVjU4MEMxMDI3LDU2MywxMDEzLDU0OSw5OTYsNTQ5eiI+PC9wYXRoPgogICAgICAgICAgICA8cGF0aCBjbGFzcz0ic3QxIiBkPSJNMTkzMCw1NDloLTQwNGMtMTcsMC0zMSwxNC0zMSwzMXY0MDRjMCwxNywxNCwzMSwzMSwzMWg0MDRjMTcsMCwzMS0xNCwzMS0zMVY1ODAgICAgIEMxOTYxLDU2MywxOTQ3LDU0OSwxOTMwLDU0OXoiPjwvcGF0aD4KICAgICAgICAgICAgPHBhdGggY2xhc3M9InN0MSIgZD0iTTk5NiwxNDgySDU5MmMtMTcsMC0zMSwxNC0zMSwzMXY0MDRjMCwxNywxNCwzMSwzMSwzMWg0MDRjMTcsMCwzMS0xNCwzMS0zMXYtNDA0ICAgICBDMTAyNywxNDk2LDEwMTMsMTQ4Miw5OTYsMTQ4MnoiPjwvcGF0aD4KICAgICAgICAgICAgPHBhdGggY2xhc3M9InN0MSIgZD0iTTE5MzAsMTQ4MmgtNDA0Yy0xNywwLTMxLDE0LTMxLDMxdjQwNGMwLDE3LDE0LDMxLDMxLDMxaDQwNGMxNywwLDMxLTE0LDMxLTMxdi00MDQgICAgIEMxOTYxLDE0OTYsMTk0NywxNDgyLDE5MzAsMTQ4MnoiPjwvcGF0aD4KICAgICAgICA8L2c+CiAgICA8L2c+CjwvZz4KPC9zdmc+',
            webUrl: 'https://www.okx.com/',
        };
        return meta;
    }, []);

    // Computed in render body (not memoized) so it picks up wallet extensions
    // injected after hydration. Folded into the value useMemo below so the
    // context reference stays stable when nothing meaningful changes.
    const { installed } = getStacksWallets();
    const configured = wallets ?? [...SUPPORTED_STACKS_WALLETS];
    const walletInfos = configured.map((w) => ({
        id: w,
        name: providerMetaByKitId[w]?.name ?? w,
        icon: providerMetaByKitId[w]?.icon ?? '',
        webUrl: providerMetaByKitId[w]?.webUrl ?? '',
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
