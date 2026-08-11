// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { SupportedStacksWallet } from '../../../src/constants/wallets';

// ── Mocks ──────────────────────────────────────────────────────────

const mockGetStacksWallets = vi.fn(() => ({
    supported: [
        'xverse',
        'leather',
        'asigna',
        'fordefi',
        'wallet-connect',
        'okx',
    ] as SupportedStacksWallet[],
    installed: [] as SupportedStacksWallet[],
}));

vi.mock('../../../src/utils/get-stacks-wallets', () => ({
    getStacksWallets: (...args: unknown[]) => mockGetStacksWallets(...args),
    checkIfStacksProviderIsInstalled: () => false,
}));

const mockGetLocalStorageWallet = vi.fn(() => null as unknown);
vi.mock('../../../src/utils/get-local-storage-wallet', () => ({
    getLocalStorageWallet: () => mockGetLocalStorageWallet(),
}));

vi.mock('../../../src/hooks/use-wallet-connect/use-wallet-connect', () => ({
    useWalletConnect: vi.fn(),
}));

const mockUseXverse = vi.fn();
vi.mock('../../../src/hooks/use-xverse/use-xverse', () => ({
    useXverse: (args: unknown) => mockUseXverse(args),
}));

vi.mock('@stacks/connect', () => ({
    clearSelectedProviderId: vi.fn(),
    getSelectedProviderId: vi.fn(),
    setSelectedProviderId: vi.fn(),
    request: vi.fn(),
    getSelectedProvider: vi.fn(),
    WalletConnect: { initializeProvider: vi.fn() },
    DEFAULT_PROVIDERS: [],
    WALLET_CONNECT_PROVIDER: {
        id: 'WalletConnectProvider',
        name: 'WalletConnect',
        icon: '',
        webUrl: '',
    },
}));

vi.mock('../../../src/provider/stacks-wallet-provider.helpers', () => ({
    getOKXStacksAddress: vi.fn(),
    extractStacksAddress: vi.fn(),
    extractBitcoinPaymentAddress: vi.fn(),
    buildWalletConnectConfig: vi.fn(),
    registerOkxProvider: vi.fn(),
    unregisterOkxProvider: vi.fn(),
    OKX_PROVIDER_META: {
        id: 'OkxStacksProvider',
        name: 'OKX',
        icon: '',
        webUrl: '',
    },
}));

vi.mock('../../../src/constants/stacks-provider-mapping', () => ({
    STACKS_TO_STACKS_CONNECT_PROVIDERS: {},
    STACKS_CONNECT_TO_STACKS_PROVIDERS: {
        WalletConnectProvider: 'wallet-connect',
        OkxStacksProvider: 'okx',
    },
}));

const { StacksWalletProvider, useStacksWalletContext } = await import(
    '../../../src/provider/stacks-wallet-provider'
);

// ── Helpers ────────────────────────────────────────────────────────

const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(
        StacksWalletProvider,
        { wallets: ['xverse', 'leather'] as SupportedStacksWallet[] },
        children
    );

// ── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
    mockGetStacksWallets.mockClear();
    mockUseXverse.mockClear();
    mockGetLocalStorageWallet.mockReturnValue(null);
});

describe('StacksWalletProvider', () => {
    it('exposes configured wallets with availability from getStacksWallets', () => {
        mockGetStacksWallets.mockReturnValue({
            supported: ['xverse', 'leather'] as SupportedStacksWallet[],
            installed: ['xverse'] as SupportedStacksWallet[],
        });

        const { result } = renderHook(() => useStacksWalletContext(), {
            wrapper,
        });

        expect(result.current.wallets).toHaveLength(2);

        const xverse = result.current.wallets.find((w) => w.id === 'xverse');
        const leather = result.current.wallets.find(
            (w) => w.id === 'leather'
        );
        expect(xverse?.available).toBe(true);
        expect(leather?.available).toBe(false);
    });

    it('starts in disconnected state', () => {
        mockGetStacksWallets.mockReturnValue({
            supported: [] as SupportedStacksWallet[],
            installed: [] as SupportedStacksWallet[],
        });

        const { result } = renderHook(() => useStacksWalletContext(), {
            wrapper,
        });

        expect(result.current.status).toBe('disconnected');
        expect(result.current.address).toBeUndefined();
        expect(result.current.provider).toBeUndefined();
    });

    it('Xverse account change updates address, publicKey and BTC address', async () => {
        mockGetStacksWallets.mockReturnValue({
            supported: ['xverse'] as SupportedStacksWallet[],
            installed: ['xverse'] as SupportedStacksWallet[],
        });
        // Start in a "connected to Xverse" state so the discriminated union
        // exposes address/publicKey (disconnected branch zeroes them out).
        mockGetLocalStorageWallet.mockReturnValue({
            provider: 'xverse',
            address: 'SP_OLD',
            publicKey: 'pk_old',
            btcAddress: 'bc1q_old',
            btcPublicKey: 'btc_pk_old',
        });

        const { result } = renderHook(() => useStacksWalletContext(), {
            wrapper,
        });

        // Wait for the async loadPersistedWallet effect to apply.
        await act(async () => {
            await new Promise((r) => setTimeout(r, 0));
        });

        expect(result.current.status).toBe('connected');
        expect(result.current.publicKey).toBe('pk_old');
        expect(result.current.btcAddress).toBe('bc1q_old');

        // Grab the latest args useXverse was called with — these contain the
        // provider's onAccountChange handler.
        const lastCall = mockUseXverse.mock.calls.at(-1)?.[0] as {
            onAccountChange: (account: {
                address: string;
                publicKey: string;
                btcAddress?: string;
                btcPublicKey?: string;
            }) => void;
            publicKey: string | undefined;
        };
        expect(lastCall?.publicKey).toBe('pk_old');
        expect(lastCall?.onAccountChange).toBeTypeOf('function');

        act(() => {
            lastCall.onAccountChange({
                address: 'SP_NEW',
                publicKey: 'pk_new',
                btcAddress: 'bc1q_new',
                btcPublicKey: 'btc_pk_new',
            });
        });

        expect(result.current.address).toBe('SP_NEW');
        expect(result.current.publicKey).toBe('pk_new');
        expect(result.current.btcAddress).toBe('bc1q_new');
        expect(result.current.btcPublicKey).toBe('btc_pk_new');
    });
});
