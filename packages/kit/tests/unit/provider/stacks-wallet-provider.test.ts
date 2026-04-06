// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
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

vi.mock('../../../src/utils/get-local-storage-wallet', () => ({
    getLocalStorageWallet: () => null,
}));

vi.mock('../../../src/hooks/use-wallet-connect/use-wallet-connect', () => ({
    useWalletConnect: vi.fn(),
}));

vi.mock('../../../src/hooks/use-xverse/use-xverse', () => ({
    useXverse: vi.fn(),
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
});
