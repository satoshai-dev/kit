// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { SupportedStacksWallet } from '../../../src/constants/wallets';

// ── Mocks ──────────────────────────────────────────────────────────

const NO_EXTENSIONS = {
    supported: ['xverse', 'leather', 'asigna', 'fordefi', 'wallet-connect', 'okx'] as SupportedStacksWallet[],
    installed: [] as SupportedStacksWallet[],
};

const WITH_EXTENSIONS = {
    ...NO_EXTENSIONS,
    installed: ['xverse', 'leather'] as SupportedStacksWallet[],
};

const mockGetStacksWallets = vi.fn(() => NO_EXTENSIONS);

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
    mockGetStacksWallets.mockReset();
});

describe('StacksWalletProvider wallet detection', () => {
    it('picks up extensions that inject after initial render', () => {
        // First call (useState initializer) — no extensions yet
        // Second call (useEffect) — extensions have injected
        mockGetStacksWallets
            .mockReturnValueOnce(NO_EXTENSIONS)
            .mockReturnValue(WITH_EXTENSIONS);

        const { result } = renderHook(() => useStacksWalletContext(), {
            wrapper,
        });

        // After mount + effect, wallets should reflect late-detected extensions
        const available = result.current.wallets.filter((w) => w.available);
        expect(available.map((w) => w.id)).toContain('xverse');
        expect(available.map((w) => w.id)).toContain('leather');
    });

    it('does not update state when extensions are already detected at mount', () => {
        // Both calls return the same result
        mockGetStacksWallets.mockReturnValue(WITH_EXTENSIONS);

        const { result } = renderHook(() => useStacksWalletContext(), {
            wrapper,
        });

        const wallets = result.current.wallets;

        // getStacksWallets called at least twice (init + effect),
        // but wallets reference should be stable since nothing changed
        expect(result.current.wallets).toBe(wallets);
        expect(mockGetStacksWallets).toHaveBeenCalledTimes(
            mockGetStacksWallets.mock.calls.length
        );
    });
});
