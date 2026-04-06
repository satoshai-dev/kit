// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { SupportedStacksWallet } from '../../../src/constants/wallets';
import type {
    WalletContextValue,
    WalletInfo,
} from '../../../src/provider/stacks-wallet-provider.types';

const mockContext: WalletContextValue = {
    status: 'disconnected',
    address: undefined,
    provider: undefined,
    connect: vi.fn(),
    disconnect: vi.fn(),
    reset: vi.fn(),
    wallets: [],
};

vi.mock('../../../src/provider/stacks-wallet-provider', () => ({
    useStacksWalletContext: () => mockContext,
}));

let mockInstalled: SupportedStacksWallet[] = [];

vi.mock('../../../src/utils/get-stacks-wallets', () => ({
    getStacksWallets: () => ({
        supported: ['xverse', 'leather', 'wallet-connect'],
        installed: mockInstalled,
    }),
}));

const { useWallets } = await import('../../../src/hooks/use-wallets');

beforeEach(() => {
    mockContext.wallets = [];
    mockInstalled = [];
});

describe('useWallets', () => {
    it('returns wallets from context with fresh detection', () => {
        const wallets: WalletInfo[] = [
            {
                id: 'xverse',
                name: 'Xverse',
                icon: 'xverse.png',
                webUrl: 'https://xverse.app',
                available: true,
            },
            {
                id: 'leather',
                name: 'Leather',
                icon: 'leather.png',
                webUrl: 'https://leather.io',
                available: false,
            },
        ];
        mockContext.wallets = wallets;
        mockInstalled = ['xverse'];

        const { result } = renderHook(() => useWallets());

        expect(result.current.wallets).toHaveLength(2);
        expect(result.current.wallets[0].available).toBe(true);
    });

    it('returns empty array when no wallets configured', () => {
        const { result } = renderHook(() => useWallets());

        expect(result.current.wallets).toEqual([]);
    });

    it('returns same reference on rerender when nothing changes', () => {
        const wallets: WalletInfo[] = [
            {
                id: 'xverse',
                name: 'Xverse',
                icon: 'xverse.png',
                webUrl: 'https://xverse.app',
                available: true,
            },
        ];
        mockContext.wallets = wallets;
        mockInstalled = ['xverse'];

        const { result, rerender } = renderHook(() => useWallets());
        const first = result.current;

        rerender();

        expect(result.current).toBe(first);
    });

    it('marks wallet available when extension injects after provider render', () => {
        // Provider rendered before extension injected — available is false
        const wallets: WalletInfo[] = [
            {
                id: 'xverse',
                name: 'Xverse',
                icon: 'xverse.png',
                webUrl: 'https://xverse.app',
                available: false,
            },
            {
                id: 'leather',
                name: 'Leather',
                icon: 'leather.png',
                webUrl: 'https://leather.io',
                available: false,
            },
        ];
        mockContext.wallets = wallets;

        // Extension has now injected into window
        mockInstalled = ['xverse', 'leather'];

        const { result } = renderHook(() => useWallets());

        expect(result.current.wallets[0].available).toBe(true);
        expect(result.current.wallets[1].available).toBe(true);
    });

    it('preserves provider availability for wallet-connect when configured', () => {
        const wallets: WalletInfo[] = [
            {
                id: 'wallet-connect',
                name: 'WalletConnect',
                icon: 'wc.png',
                webUrl: '',
                available: true,
            },
        ];
        mockContext.wallets = wallets;
        mockInstalled = ['wallet-connect'];

        const { result } = renderHook(() => useWallets());

        expect(result.current.wallets[0].available).toBe(true);
    });

    it('does not override wallet-connect availability when provider says unavailable', () => {
        // Provider computed available: false (no projectId configured)
        const wallets: WalletInfo[] = [
            {
                id: 'wallet-connect',
                name: 'WalletConnect',
                icon: 'wc.png',
                webUrl: '',
                available: false,
            },
        ];
        mockContext.wallets = wallets;
        // getStacksWallets unconditionally returns wallet-connect as installed,
        // but the hook must not override the provider's projectId-gated decision
        mockInstalled = ['wallet-connect'];

        const { result } = renderHook(() => useWallets());

        expect(result.current.wallets[0].available).toBe(false);
    });
});
