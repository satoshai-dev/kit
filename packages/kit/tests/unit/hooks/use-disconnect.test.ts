// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { WalletContextValue } from '../../../src/provider/stacks-wallet-provider.types';

const mockContext: WalletContextValue = {
    status: 'connected',
    address: 'SP123',
    provider: 'xverse',
    connect: vi.fn(),
    disconnect: vi.fn(),
    reset: vi.fn(),
    wallets: [],
};

vi.mock('../../../src/provider/stacks-wallet-provider', () => ({
    useStacksWalletContext: () => mockContext,
}));

const { useDisconnect } = await import('../../../src/hooks/use-disconnect');

beforeEach(() => {
    vi.mocked(mockContext.disconnect).mockReset();
});

describe('useDisconnect', () => {
    it('returns idle state initially', () => {
        const { result } = renderHook(() => useDisconnect());

        expect(result.current.status).toBe('idle');
        expect(result.current.isIdle).toBe(true);
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(false);
        expect(result.current.isError).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('transitions to success on disconnect', () => {
        const { result } = renderHook(() => useDisconnect());

        act(() => {
            result.current.disconnect();
        });

        expect(result.current.status).toBe('success');
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.error).toBeNull();
        expect(mockContext.disconnect).toHaveBeenCalled();
    });

    it('forwards callback to context disconnect', () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useDisconnect());

        act(() => {
            result.current.disconnect(callback);
        });

        expect(mockContext.disconnect).toHaveBeenCalledWith(callback);
    });

    it('transitions to error when disconnect throws', () => {
        vi.mocked(mockContext.disconnect).mockImplementation(() => {
            throw new Error('Disconnect failed');
        });

        const { result } = renderHook(() => useDisconnect());

        act(() => {
            result.current.disconnect();
        });

        expect(result.current.status).toBe('error');
        expect(result.current.isError).toBe(true);
        expect(result.current.error?.message).toBe('Disconnect failed');
    });

    it('normalizes non-Error throws', () => {
        vi.mocked(mockContext.disconnect).mockImplementation(() => {
            throw 'string error';
        });

        const { result } = renderHook(() => useDisconnect());

        act(() => {
            result.current.disconnect();
        });

        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toBe('string error');
    });

    it('clears previous error on new disconnect', () => {
        vi.mocked(mockContext.disconnect).mockImplementation(() => {
            throw new Error('First failure');
        });

        const { result } = renderHook(() => useDisconnect());

        act(() => {
            result.current.disconnect();
        });

        expect(result.current.isError).toBe(true);

        // Second disconnect succeeds
        vi.mocked(mockContext.disconnect).mockImplementation(() => {});

        act(() => {
            result.current.disconnect();
        });

        expect(result.current.status).toBe('success');
        expect(result.current.error).toBeNull();
    });

    it('reset clears state back to idle', () => {
        const { result } = renderHook(() => useDisconnect());

        act(() => {
            result.current.disconnect();
        });

        expect(result.current.isSuccess).toBe(true);

        act(() => {
            result.current.reset();
        });

        expect(result.current.status).toBe('idle');
        expect(result.current.isIdle).toBe(true);
        expect(result.current.error).toBeNull();
    });
});
