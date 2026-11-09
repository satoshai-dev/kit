// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@stacks/connect', () => ({
    WalletConnect: {
        Chains: {
            Stacks: {
                Mainnet: { id: 1, chainNamespace: 'stacks', caipNetworkId: 'stacks:1', name: 'Stacks' },
                Testnet: { id: 2147483648, chainNamespace: 'stacks', caipNetworkId: 'stacks:2147483648', name: 'Stacks Testnet' },
            },
        },
        Networks: {
            Stacks: {
                namespace: 'stacks',
                methods: ['stx_signMessage', 'stx_callContract'],
                events: ['stx_accountsChanged'],
            },
        },
    },
}));

import {
    AppKitStacksProvider,
    getStacksAppKitConfig,
    installAppKitStacksProvider,
    type AppKitUniversalProvider,
    type StacksAppKit,
} from '../../../src/provider/appkit-walletconnect';

const ADDRESS = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';

type Session = NonNullable<AppKitUniversalProvider['session']>;

const stacksSession = (overrides: Partial<Session> = {}): Session => ({
    topic: 't1',
    namespaces: {
        stacks: {
            accounts: [`stacks:1:${ADDRESS}`],
            methods: ['stx_signMessage', 'stx_callContract'],
        },
    },
    sessionProperties: {
        stacks_getAddresses: JSON.stringify([{ address: ADDRESS, publicKey: '02ab' }]),
    },
    ...overrides,
});

const makeUniversalProvider = (session?: Session) => {
    const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
    const provider = {
        session,
        request: vi.fn(),
        on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
            (listeners[event] ||= []).push(handler);
        }),
        off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
            listeners[event] = (listeners[event] || []).filter((h) => h !== handler);
        }),
        disconnect: vi.fn(async () => {
            provider.session = undefined;
        }),
        emit: (event: string) => (listeners[event] || []).forEach((h) => h()),
    };
    return provider;
};

const makeAppKit = (provider: ReturnType<typeof makeUniversalProvider>) => {
    const subscribers: ((s: { open: boolean }) => void)[] = [];
    const appKit = {
        open: vi.fn(async () => {
            subscribers.forEach((s) => s({ open: true }));
        }),
        close: vi.fn(),
        getUniversalProvider: vi.fn(async () => provider as unknown as AppKitUniversalProvider),
        subscribeState: vi.fn((cb: (s: { open: boolean }) => void) => {
            subscribers.push(cb);
            return () => {
                subscribers.splice(subscribers.indexOf(cb), 1);
            };
        }),
        closeModal: () => subscribers.forEach((s) => s({ open: false })),
    };
    return appKit;
};

describe('getStacksAppKitConfig', () => {
    it('returns Stacks networks and session overrides', () => {
        const config = getStacksAppKitConfig(['mainnet', 'testnet']);
        expect(config.networks.map((n) => n.caipNetworkId)).toEqual(['stacks:1', 'stacks:2147483648']);
        expect(config.universalProviderConfigOverride.methods.stacks).toEqual([
            'stx_signMessage',
            'stx_callContract',
        ]);
        expect(config.universalProviderConfigOverride.chains.stacks).toEqual([
            'stacks:1',
            'stacks:2147483648',
        ]);
    });

    it('proposes the SIP-030 account event next to the @stacks/connect events', () => {
        expect(getStacksAppKitConfig().universalProviderConfigOverride.events.stacks).toEqual([
            'stx_accountsChanged',
            'stx_accountChange',
        ]);
    });

    it('defaults to mainnet', () => {
        expect(getStacksAppKitConfig().networks.map((n) => n.caipNetworkId)).toEqual(['stacks:1']);
    });
});

describe('AppKitStacksProvider', () => {
    let up: ReturnType<typeof makeUniversalProvider>;
    let appKit: ReturnType<typeof makeAppKit>;
    let provider: AppKitStacksProvider;

    beforeEach(() => {
        up = makeUniversalProvider();
        appKit = makeAppKit(up);
        provider = new AppKitStacksProvider(appKit as unknown as StacksAppKit);
    });

    it('prefers addresses with a public key from session properties', async () => {
        up.session = stacksSession();
        await provider.init();
        expect(provider.stacksAddresses).toEqual([{ address: ADDRESS, publicKey: '02ab' }]);
    });

    it('returns no addresses when the session has no Stacks namespace', async () => {
        up.session = stacksSession({ namespaces: { bip122: { accounts: ['bip122:x:bc1q'] } } });
        await provider.init();
        expect(provider.stacksAddresses).toEqual([]);
        expect(provider.hasStacksSession).toBe(false);
    });

    it('answers getAddresses from an existing session without opening the modal', async () => {
        up.session = stacksSession();
        const response = await provider.request('getAddresses');
        expect(response).toEqual({
            jsonrpc: '2.0',
            id: 1,
            result: { addresses: [{ address: ADDRESS, publicKey: '02ab' }] },
        });
        expect(appKit.open).not.toHaveBeenCalled();
    });

    it('connects when the modal closes with a Stacks session', async () => {
        const pending = provider.connect();
        await vi.waitFor(() => expect(appKit.open).toHaveBeenCalled());
        up.session = stacksSession();
        appKit.closeModal();
        await expect(pending).resolves.toEqual(up.session);
        expect(up.off).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('switches to the Bitcoin namespace before it opens the QR', async () => {
        const btc = { id: 'btc', chainNamespace: 'bip122' };
        Object.assign(appKit, {
            getCaipNetworks: vi.fn((ns?: string) => (ns === 'bip122' ? [btc] : [])),
            getActiveChainNamespace: vi.fn(() => 'eip155'),
            switchNetwork: vi.fn(async () => undefined),
        });
        const pending = provider.connect();
        await vi.waitFor(() => expect(appKit.open).toHaveBeenCalled());
        expect((appKit as unknown as { switchNetwork: ReturnType<typeof vi.fn> }).switchNetwork).toHaveBeenCalledWith(btc);
        expect(appKit.open).toHaveBeenCalledWith({ view: 'ConnectingWalletConnectBasic' });
        appKit.closeModal();
        await expect(pending).rejects.toThrow();
    });

    it('does not switch when Bitcoin is already active', async () => {
        const switchNetwork = vi.fn(async () => undefined);
        Object.assign(appKit, {
            getCaipNetworks: vi.fn(() => [{ id: 'btc' }]),
            getActiveChainNamespace: vi.fn(() => 'bip122'),
            switchNetwork,
        });
        const pending = provider.connect();
        await vi.waitFor(() => expect(appKit.open).toHaveBeenCalled());
        expect(switchNetwork).not.toHaveBeenCalled();
        appKit.closeModal();
        await expect(pending).rejects.toThrow();
    });

    it('keeps the active namespace when AppKit has no Bitcoin network', async () => {
        const switchNetwork = vi.fn(async () => undefined);
        Object.assign(appKit, {
            getCaipNetworks: vi.fn(() => []),
            getActiveChainNamespace: vi.fn(() => 'eip155'),
            switchNetwork,
        });
        const pending = provider.connect();
        await vi.waitFor(() => expect(appKit.open).toHaveBeenCalled());
        expect(switchNetwork).not.toHaveBeenCalled();
        appKit.closeModal();
        await expect(pending).rejects.toThrow();
    });

    it('uses an explicit modal namespace', async () => {
        const sol = { id: 'sol' };
        const switchNetwork = vi.fn(async () => undefined);
        Object.assign(appKit, {
            getCaipNetworks: vi.fn((ns?: string) => (ns === 'solana' ? [sol] : [{ id: 'btc' }])),
            getActiveChainNamespace: vi.fn(() => 'eip155'),
            switchNetwork,
        });
        const custom = new AppKitStacksProvider(appKit as unknown as StacksAppKit, ['mainnet'], 'solana');
        const pending = custom.connect();
        await vi.waitFor(() => expect(appKit.open).toHaveBeenCalled());
        expect(switchNetwork).toHaveBeenCalledWith(sol);
        appKit.closeModal();
        await expect(pending).rejects.toThrow();
    });

    it('connects on the provider connect event', async () => {
        const pending = provider.connect();
        await vi.waitFor(() => expect(appKit.open).toHaveBeenCalled());
        up.session = stacksSession();
        up.emit('connect');
        await expect(pending).resolves.toEqual(up.session);
    });

    it('rejects when the user closes the modal', async () => {
        const pending = provider.connect();
        await vi.waitFor(() => expect(appKit.open).toHaveBeenCalled());
        appKit.closeModal();
        await expect(pending).rejects.toThrow('User closed the WalletConnect modal');
    });

    it('rejects when the wallet approves a session without Stacks', async () => {
        const pending = provider.connect();
        await vi.waitFor(() => expect(appKit.open).toHaveBeenCalled());
        up.session = stacksSession({ namespaces: { bip122: { accounts: ['bip122:x:bc1q'] } } });
        appKit.closeModal();
        await expect(pending).rejects.toThrow('did not approve Stacks');
    });

    it('ends an active session without Stacks, then opens the QR', async () => {
        up.session = stacksSession({ namespaces: { bip122: { accounts: ['bip122:x:bc1q'] } } });
        const pending = provider.connect();
        await vi.waitFor(() => expect(appKit.open).toHaveBeenCalled());
        expect(up.disconnect).toHaveBeenCalledTimes(1);
        up.session = stacksSession();
        appKit.closeModal();
        await expect(pending).resolves.toEqual(up.session);
    });

    it('still opens the QR when ending the old session fails', async () => {
        up.session = stacksSession({ namespaces: { bip122: { accounts: ['bip122:x:bc1q'] } } });
        up.disconnect.mockRejectedValueOnce(new Error('Record was recently deleted'));
        const pending = provider.connect();
        await vi.waitFor(() => expect(appKit.open).toHaveBeenCalled());
        appKit.closeModal();
        await expect(pending).rejects.toThrow();
    });

    it('sends requests to the Stacks chain and wraps the result', async () => {
        up.session = stacksSession();
        up.request.mockResolvedValue({ txid: '0xabc', transaction: '00' });
        const response = await provider.request('stx_callContract', { contract: 'SP1.c' });
        expect(up.request).toHaveBeenCalledWith(
            { method: 'stx_callContract', params: { contract: 'SP1.c' } },
            'stacks:1'
        );
        expect(response).toEqual({ jsonrpc: '2.0', id: 1, result: { txid: '0xabc', transaction: '00' } });
    });

    it('keeps a JSON-RPC envelope from the wallet', async () => {
        up.session = stacksSession();
        const envelope = { jsonrpc: '2.0', id: 7, result: { txid: '0x1' } };
        up.request.mockResolvedValue(envelope);
        expect(await provider.request('stx_callContract', {})).toBe(envelope);
    });

    it('uses the network param to pick the chain', async () => {
        up.session = stacksSession();
        up.request.mockResolvedValue({});
        await provider.request('stx_callContract', { network: 'testnet' });
        expect(up.request).toHaveBeenLastCalledWith(expect.anything(), 'stacks:2147483648');
    });

    it('adds the session address to stx_signMessage', async () => {
        up.session = stacksSession();
        up.request.mockResolvedValue({ signature: 'sig' });
        await provider.request('stx_signMessage', { message: 'hi' });
        expect(up.request).toHaveBeenCalledWith(
            { method: 'stx_signMessage', params: { address: ADDRESS, message: 'hi' } },
            'stacks:1'
        );
    });

    it('rejects methods the wallet did not approve', async () => {
        up.session = stacksSession();
        await expect(provider.request('stx_deployContract', {})).rejects.toThrow(
            'does not support stx_deployContract'
        );
    });

    it('rejects requests without a Stacks session', async () => {
        await expect(provider.request('stx_callContract', {})).rejects.toThrow('not connected');
    });

    it('disconnects the session', async () => {
        up.session = stacksSession();
        await provider.init();
        await provider.disconnect();
        expect(up.disconnect).toHaveBeenCalled();
    });

    it('waits for AppKit to be ready before it reads the provider', async () => {
        const order: string[] = [];
        let release!: () => void;
        const ready = new Promise<void>((r) => (release = r));
        Object.assign(appKit, {
            ready: vi.fn(async () => {
                await ready;
                order.push('ready');
            }),
        });
        appKit.getUniversalProvider.mockImplementation(async () => {
            order.push('provider');
            return up as unknown as AppKitUniversalProvider;
        });
        const pending = provider.init();
        await Promise.resolve();
        expect(order).toEqual([]);
        release();
        await pending;
        expect(order).toEqual(['ready', 'provider']);
    });

    it('keeps a session without Stacks on disconnect', async () => {
        up.session = stacksSession({ namespaces: { bip122: { accounts: ['bip122:x:bc1q'] } } });
        await provider.init();
        await provider.disconnect();
        expect(up.disconnect).not.toHaveBeenCalled();
    });

    it('throws when AppKit has no universal provider', async () => {
        appKit.getUniversalProvider.mockResolvedValueOnce(undefined as never);
        await expect(provider.init()).rejects.toThrow('no WalletConnect provider');
    });
});

const win = window as unknown as { WalletConnectProvider?: unknown };

describe('installAppKitStacksProvider', () => {
    beforeEach(() => {
        delete win.WalletConnectProvider;
    });

    it('installs the provider on window and reuses it for the same AppKit', () => {
        const appKit = makeAppKit(makeUniversalProvider()) as unknown as StacksAppKit;
        const first = installAppKitStacksProvider(appKit);
        expect(win.WalletConnectProvider).toBe(first);
        expect(installAppKitStacksProvider(appKit)).toBe(first);
    });

    it('replaces the provider for a different AppKit', () => {
        const first = installAppKitStacksProvider(
            makeAppKit(makeUniversalProvider()) as unknown as StacksAppKit
        );
        const second = installAppKitStacksProvider(
            makeAppKit(makeUniversalProvider()) as unknown as StacksAppKit
        );
        expect(second).not.toBe(first);
        expect(win.WalletConnectProvider).toBe(second);
    });
});
