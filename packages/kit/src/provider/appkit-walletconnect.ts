import { WalletConnect } from '@stacks/connect';

import type { StacksChain } from './stacks-wallet-provider.types';

/**
 * The parts of a Reown AppKit instance (`createAppKit()`) that the kit uses.
 *
 * Typed structurally so the kit does not depend on `@reown/appkit`. Any
 * AppKit 1.8+ instance matches.
 */
// Method syntax on purpose: it keeps parameter checks bivariant, so the real
// AppKit types (with narrower option unions) are assignable.
export interface StacksAppKit {
    /** Resolves when AppKit finished its setup (AppKit 1.8+). */
    ready?(): Promise<void>;
    open(options?: { view?: string; namespace?: string }): Promise<unknown>;
    /** AppKit's configured networks, optionally for one namespace. */
    getCaipNetworks?(namespace?: string): unknown[];
    getActiveChainNamespace?(): string | undefined;
    switchNetwork?(network: unknown): Promise<unknown>;
    close(): unknown;
    getUniversalProvider(): Promise<AppKitUniversalProvider | undefined>;
    subscribeState(callback: (state: { open: boolean }) => void): () => void;
}

/** The parts of `@walletconnect/universal-provider` that the kit uses. */
export interface AppKitUniversalProvider {
    session?: {
        topic: string;
        namespaces: Record<string, { accounts?: string[]; methods?: string[] } | undefined>;
        sessionProperties?: Record<string, string>;
    };
    client?: { ping(params: { topic: string }): Promise<void> };
    request<T = unknown>(
        args: { method: string; params?: unknown },
        chain?: string
    ): Promise<T>;
    on(event: string, handler: (...args: unknown[]) => void): unknown;
    off(event: string, handler: (...args: unknown[]) => void): unknown;
    disconnect(): Promise<void>;
}

/** A Stacks network in the shape AppKit's `networks` option takes. */
export interface StacksAppKitNetwork {
    id: number;
    chainNamespace: 'stacks';
    caipNetworkId: `stacks:${number}`;
    name: string;
    nativeCurrency: { name: string; symbol: string; decimals: number };
    rpcUrls: { default: { http: string[] } };
}

/** Return value of {@link getStacksAppKitConfig}. */
export interface StacksAppKitConfig {
    networks: StacksAppKitNetwork[];
    universalProviderConfigOverride: {
        methods: { stacks: string[] };
        chains: { stacks: string[] };
        events: { stacks: string[] };
    };
}

// CAIP-2 ids of the Stacks chains (same values as @stacks/connect's
// WalletConnect.Chains.Stacks).
const STACKS_CHAIN_IDS = {
    mainnet: 'stacks:1',
    testnet: 'stacks:2147483648',
} as const;

const ADDRESS_METHODS = ['getAddresses', 'stx_getAddresses', 'stx_getAccounts'];

/**
 * Stacks networks and session overrides to pass to `createAppKit()`, so the
 * app's AppKit asks WalletConnect wallets for Stacks next to its own chains.
 *
 * @example
 * ```ts
 * const stacks = getStacksAppKitConfig();
 * createAppKit({
 *     networks: [bitcoin, ...stacks.networks],
 *     universalProviderConfigOverride: stacks.universalProviderConfigOverride,
 *     // ...
 * });
 * ```
 */
export const getStacksAppKitConfig = (
    chains: StacksChain[] = ['mainnet']
): StacksAppKitConfig => {
    const networks = chains.map(
        (chain) =>
            ({
                ...(chain === 'mainnet'
                    ? WalletConnect.Chains.Stacks.Mainnet
                    : WalletConnect.Chains.Stacks.Testnet),
            }) as StacksAppKitNetwork
    );
    return {
        networks,
        universalProviderConfigOverride: {
            methods: { stacks: [...WalletConnect.Networks.Stacks.methods] },
            chains: { stacks: networks.map((n) => n.caipNetworkId) },
            // Add the SIP-030 event name next to the @stacks/connect names, so
            // that wallets can emit either one.
            events: {
                stacks: Array.from(
                    new Set([...WalletConnect.Networks.Stacks.events, 'stx_accountChange'])
                ),
            },
        },
    };
};

const toRpcResponse = (result: unknown) => {
    // Some wallets already answer with a JSON-RPC envelope; keep it as is.
    if (
        result &&
        typeof result === 'object' &&
        'jsonrpc' in result &&
        ('result' in result || 'error' in result)
    ) {
        return result;
    }
    return { jsonrpc: '2.0', id: 1, result };
};

/**
 * A `window.WalletConnectProvider` backed by the app's AppKit.
 *
 * `@stacks/connect` resolves the WalletConnect wallet from
 * `window.WalletConnectProvider` and skips its own AppKit setup when that
 * object exists. This class has the same interface as the wrapper that
 * `@stacks/connect` builds, so `request()` and the kit hooks work unchanged,
 * and only one AppKit runs on the page.
 */
export class AppKitStacksProvider {
    readonly isAppKitStacksProvider = true;
    readonly connector: {
        appKit: StacksAppKit;
        provider?: AppKitUniversalProvider;
    };
    private readonly chains: StacksChain[];
    private readonly modalNamespace?: string;

    constructor(
        appKit: StacksAppKit,
        chains: StacksChain[] = ['mainnet'],
        modalNamespace?: string
    ) {
        this.connector = { appKit };
        this.chains = chains;
        this.modalNamespace = modalNamespace;
    }

    /**
     * The AppKit namespace whose WalletConnect view shows the QR. AppKit
     * passes the new session to that namespace's adapter. The Bitcoin
     * adapter accepts a session without Bitcoin accounts; the EVM (wagmi)
     * adapter throws on one. So prefer Bitcoin when the app has it, else
     * keep AppKit's active namespace.
     */
    private getModalNamespace(): string | undefined {
        if (this.modalNamespace) return this.modalNamespace;
        const bitcoinNetworks = this.connector.appKit.getCaipNetworks?.('bip122') ?? [];
        return bitcoinNetworks.length > 0 ? 'bip122' : undefined;
    }

    /** Load the AppKit universal provider. AppKit restores a saved session itself. */
    async init(): Promise<AppKitUniversalProvider> {
        if (this.connector.provider) return this.connector.provider;
        // A modal opened during AppKit setup closes again at once, and the
        // session restore is not done yet. Wait for setup first.
        await this.connector.appKit.ready?.();
        const provider = await this.connector.appKit.getUniversalProvider();
        if (!provider) {
            throw new Error(
                'AppKit has no WalletConnect provider. Check the AppKit projectId.'
            );
        }
        this.connector.provider = provider;
        return provider;
    }

    /** Stacks accounts in the current session, or `[]` if the session has no Stacks. */
    get stacksAddresses(): { address: string; publicKey: string }[] {
        const session = this.connector.provider?.session;
        const accounts = session?.namespaces?.stacks?.accounts ?? [];
        if (!accounts.length) return [];

        let fromProperties: { address: string; publicKey: string }[] = [];
        try {
            fromProperties = JSON.parse(
                session?.sessionProperties?.stacks_getAddresses || '[]'
            );
        } catch {
            fromProperties = [];
        }

        // Entries with a public key win over bare CAIP-10 accounts.
        const merged = [
            ...accounts.map((a) => ({ address: a.split(':')[2] ?? '', publicKey: '' })),
            ...fromProperties,
        ]
            .filter((a) => a.address)
            .sort((a) => (a.publicKey ? 1 : -1));
        return Array.from(new Map(merged.map((a) => [a.address, a])).values());
    }

    /** `true` when the current session includes the Stacks namespace. */
    get hasStacksSession(): boolean {
        return this.stacksAddresses.length > 0;
    }

    /**
     * Open the AppKit WalletConnect view and wait for a session that
     * includes Stacks. Reuses the current session when it already has Stacks,
     * and ends a session without Stacks first.
     */
    async connect() {
        const provider = await this.init();
        if (this.hasStacksSession) return provider.session;

        // A session without Stacks (an older session, or one made for the
        // app's other chains) blocks a new pairing. End it so the user can
        // connect. This also disconnects that wallet from the other chains.
        if (provider.session) {
            try {
                await provider.disconnect();
            } catch {
                // The session can already be gone on the relay.
            }
        }

        const { appKit } = this.connector;

        return new Promise<AppKitUniversalProvider['session']>((resolve, reject) => {
            let settled = false;
            let wasOpen = false;
            const subscription: { unsubscribe?: () => void } = {};

            const finish = (error?: Error) => {
                if (settled) return;
                settled = true;
                subscription.unsubscribe?.();
                provider.off('connect', onConnect);
                if (error) reject(error);
                else resolve(provider.session);
            };

            const checkSession = () => {
                if (this.hasStacksSession) {
                    finish();
                    return true;
                }
                if (provider.session) {
                    finish(
                        new Error(
                            'The wallet did not approve Stacks. Use a wallet that supports Stacks over WalletConnect.'
                        )
                    );
                    return true;
                }
                return false;
            };

            const onConnect = () => {
                checkSession();
            };
            provider.on('connect', onConnect);

            subscription.unsubscribe = appKit.subscribeState((state) => {
                if (state.open) {
                    wasOpen = true;
                    return;
                }
                if (!wasOpen) return;
                if (!checkSession()) {
                    finish(new Error('User closed the WalletConnect modal'));
                }
            });

            this.activateNamespace(this.getModalNamespace())
                .then(() => appKit.open({ view: 'ConnectingWalletConnectBasic' }))
                .catch((error: unknown) =>
                    finish(error instanceof Error ? error : new Error(String(error)))
                );
        });
    }

    /**
     * Make `namespace` AppKit's active namespace before the QR view opens.
     * `open({ view, namespace })` ignores the view when it switches the
     * namespace, so switch first. `switchNetwork` changes only the active
     * namespace here: it does not open the modal or touch other connections.
     */
    private async activateNamespace(namespace: string | undefined) {
        const { appKit } = this.connector;
        if (!namespace || appKit.getActiveChainNamespace?.() === namespace) return;
        const network = appKit.getCaipNetworks?.(namespace)?.[0];
        if (network && appKit.switchNetwork) {
            await appKit.switchNetwork(network);
        }
    }

    private targetChain(params?: unknown): string {
        const network =
            params && typeof params === 'object' && 'network' in params
                ? (params as { network?: unknown }).network
                : undefined;
        if (network === 'mainnet' || network === 'testnet') {
            return STACKS_CHAIN_IDS[network];
        }
        return STACKS_CHAIN_IDS[this.chains[0] ?? 'mainnet'];
    }

    /**
     * JSON-RPC entry point called by `@stacks/connect`. Returns a JSON-RPC
     * envelope (`{ result }`), which is what `@stacks/connect` unwraps.
     */
    async request(method: string, params?: unknown) {
        if (ADDRESS_METHODS.includes(method)) {
            if (!this.hasStacksSession) await this.connect();
            return toRpcResponse({ addresses: this.stacksAddresses });
        }

        const provider = await this.init();
        const methods = provider.session?.namespaces?.stacks?.methods ?? [];
        if (!this.hasStacksSession) {
            throw new Error('WalletConnect is not connected. Connect a wallet first.');
        }
        if (!methods.includes(method)) {
            throw new Error(`The WalletConnect wallet does not support ${method}.`);
        }

        let requestParams = params;
        if (method === 'stx_signMessage') {
            requestParams = {
                address: this.stacksAddresses[0]?.address,
                ...(params as object),
            };
        }

        const result = await provider.request(
            { method, params: requestParams },
            this.targetChain(params)
        );
        return toRpcResponse(result);
    }

    /**
     * End the WalletConnect session. This also ends it for AppKit's other
     * chains. A session without Stacks belongs to the app's other chains
     * only, so it stays: the kit also calls this after a failed connect.
     */
    async disconnect() {
        const provider = this.connector.provider;
        if (!provider?.session || !this.hasStacksSession) return;
        await provider.disconnect();
    }
}

/** Type guard for the provider installed by {@link installAppKitStacksProvider}. */
export const isAppKitStacksProvider = (
    value: unknown
): value is AppKitStacksProvider =>
    !!value &&
    typeof value === 'object' &&
    (value as { isAppKitStacksProvider?: boolean }).isAppKitStacksProvider === true;

/**
 * Install (or reuse) the AppKit-backed provider at `window.WalletConnectProvider`.
 * Must run before any `@stacks/connect` WalletConnect call, so that
 * `@stacks/connect` does not start its own AppKit.
 */
export const installAppKitStacksProvider = (
    appKit: StacksAppKit,
    chains?: StacksChain[],
    modalNamespace?: string
): AppKitStacksProvider | undefined => {
    if (typeof window === 'undefined') return undefined;
    const current = window.WalletConnectProvider;
    if (isAppKitStacksProvider(current) && current.connector.appKit === appKit) {
        return current;
    }
    const provider = new AppKitStacksProvider(appKit, chains, modalNamespace);
    window.WalletConnectProvider = provider;
    return provider;
};
