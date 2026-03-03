// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { WalletContextValue } from '../../../src/provider/stacks-wallet-provider.types';

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

const { useAddress } = await import('../../../src/hooks/use-address');

beforeEach(() => {
    mockContext.status = 'disconnected';
    mockContext.address = undefined;
    mockContext.provider = undefined;
});

describe('useAddress', () => {
    it('returns disconnected state when status is disconnected', () => {
        const { result } = renderHook(() => useAddress());

        expect(result.current.isConnected).toBe(false);
        expect(result.current.isDisconnected).toBe(true);
        expect(result.current.isConnecting).toBe(false);
        expect(result.current.address).toBeUndefined();
        expect(result.current.provider).toBeUndefined();
    });

    it('returns connecting state when status is connecting', () => {
        mockContext.status = 'connecting';

        const { result } = renderHook(() => useAddress());

        expect(result.current.isConnected).toBe(false);
        expect(result.current.isConnecting).toBe(true);
        expect(result.current.isDisconnected).toBe(false);
        expect(result.current.address).toBeUndefined();
        expect(result.current.provider).toBeUndefined();
    });

    it('returns connected state with address and provider', () => {
        mockContext.status = 'connected';
        mockContext.address = 'SP123' as string;
        mockContext.provider = 'xverse';

        const { result } = renderHook(() => useAddress());

        expect(result.current.isConnected).toBe(true);
        expect(result.current.isConnecting).toBe(false);
        expect(result.current.isDisconnected).toBe(false);
        expect(result.current.address).toBe('SP123');
        expect(result.current.provider).toBe('xverse');
    });

    it('falls back to not-connected when status is connected but address is missing', () => {
        mockContext.status = 'connected';
        mockContext.address = undefined as unknown as string;
        mockContext.provider = 'xverse';

        const { result } = renderHook(() => useAddress());

        expect(result.current.isConnected).toBe(false);
    });

    it('falls back to not-connected when status is connected but provider is missing', () => {
        mockContext.status = 'connected';
        mockContext.address = 'SP123' as string;
        mockContext.provider = undefined as unknown as 'xverse';

        const { result } = renderHook(() => useAddress());

        expect(result.current.isConnected).toBe(false);
    });
});
