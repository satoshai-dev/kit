// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

const { useWallets } = await import('../../../src/hooks/use-wallets');

beforeEach(() => {
    mockContext.wallets = [];
});

describe('useWallets', () => {
    it('returns wallets from context', () => {
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

        const { result } = renderHook(() => useWallets());

        expect(result.current.wallets).toBe(wallets);
        expect(result.current.wallets).toHaveLength(2);
    });

    it('returns empty array when no wallets available', () => {
        const { result } = renderHook(() => useWallets());

        expect(result.current.wallets).toEqual([]);
    });

    it('returns same reference on rerender when wallets unchanged', () => {
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

        const { result, rerender } = renderHook(() => useWallets());
        const first = result.current;

        rerender();

        expect(result.current).toBe(first);
    });
});
