// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
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

// Import after mock is set up
const { useConnect } = await import('../../../src/hooks/use-connect');

beforeEach(() => {
    vi.mocked(mockContext.connect).mockReset();
    vi.mocked(mockContext.reset).mockReset();
    mockContext.status = 'disconnected';
});

describe('useConnect', () => {
    it('returns idle state initially', () => {
        const { result } = renderHook(() => useConnect());

        expect(result.current.status).toBe('idle');
        expect(result.current.isIdle).toBe(true);
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(false);
        expect(result.current.isError).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('transitions to pending when connect is called', async () => {
        // connect never resolves — we just want to observe the pending state
        vi.mocked(mockContext.connect).mockImplementation(
            () => new Promise(() => {})
        );

        const { result } = renderHook(() => useConnect());

        // Don't await — we want to check intermediate state
        act(() => {
            void result.current.connect('xverse');
        });

        expect(result.current.status).toBe('pending');
        expect(result.current.isPending).toBe(true);
        expect(result.current.isIdle).toBe(false);
    });

    it('transitions to success when connect succeeds', async () => {
        vi.mocked(mockContext.connect).mockImplementation(
            async (_providerId, options) => {
                options?.onSuccess?.('SP123', 'xverse');
            }
        );

        const { result } = renderHook(() => useConnect());

        await act(async () => {
            await result.current.connect('xverse');
        });

        expect(result.current.status).toBe('success');
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.error).toBeNull();
    });

    it('transitions to error when connect fails', async () => {
        const testError = new Error('Wallet not installed');

        vi.mocked(mockContext.connect).mockImplementation(
            async (_providerId, options) => {
                options?.onError?.(testError);
            }
        );

        const { result } = renderHook(() => useConnect());

        await act(async () => {
            await result.current.connect('xverse');
        });

        expect(result.current.status).toBe('error');
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBe(testError);
    });

    it('forwards onSuccess callback to consumer', async () => {
        vi.mocked(mockContext.connect).mockImplementation(
            async (_providerId, options) => {
                options?.onSuccess?.('SP123', 'xverse');
            }
        );

        const onSuccess = vi.fn();
        const { result } = renderHook(() => useConnect());

        await act(async () => {
            await result.current.connect('xverse', { onSuccess });
        });

        expect(onSuccess).toHaveBeenCalledWith('SP123', 'xverse');
    });

    it('forwards onError callback to consumer', async () => {
        const testError = new Error('Connection failed');

        vi.mocked(mockContext.connect).mockImplementation(
            async (_providerId, options) => {
                options?.onError?.(testError);
            }
        );

        const onError = vi.fn();
        const { result } = renderHook(() => useConnect());

        await act(async () => {
            await result.current.connect('xverse', { onError });
        });

        expect(onError).toHaveBeenCalledWith(testError);
    });

    it('resets to idle when connect returns without settling (cancelled)', async () => {
        // Simulate provider's stale-generation bail: returns without calling onSuccess/onError
        vi.mocked(mockContext.connect).mockResolvedValue(undefined);

        const { result } = renderHook(() => useConnect());

        await act(async () => {
            await result.current.connect('xverse');
        });

        expect(result.current.status).toBe('idle');
        expect(result.current.isIdle).toBe(true);
        expect(result.current.error).toBeNull();
    });

    it('clears previous error when starting a new connect', async () => {
        const testError = new Error('First failure');

        vi.mocked(mockContext.connect).mockImplementation(
            async (_providerId, options) => {
                options?.onError?.(testError);
            }
        );

        const { result } = renderHook(() => useConnect());

        await act(async () => {
            await result.current.connect('xverse');
        });

        expect(result.current.isError).toBe(true);

        // Now start a new connect that never settles
        vi.mocked(mockContext.connect).mockImplementation(
            () => new Promise(() => {})
        );

        act(() => {
            void result.current.connect('leather');
        });

        expect(result.current.error).toBeNull();
        expect(result.current.status).toBe('pending');
    });

    it('reset clears error and status back to idle', async () => {
        const testError = new Error('Failed');

        vi.mocked(mockContext.connect).mockImplementation(
            async (_providerId, options) => {
                options?.onError?.(testError);
            }
        );

        const { result } = renderHook(() => useConnect());

        await act(async () => {
            await result.current.connect('xverse');
        });

        expect(result.current.isError).toBe(true);

        act(() => {
            result.current.reset();
        });

        expect(result.current.status).toBe('idle');
        expect(result.current.isIdle).toBe(true);
        expect(result.current.error).toBeNull();
        expect(mockContext.reset).toHaveBeenCalled();
    });

    it('reflects walletStatus connecting in isPending', () => {
        mockContext.status = 'connecting';

        const { result } = renderHook(() => useConnect());

        expect(result.current.isPending).toBe(true);
        // mutation status itself is still idle
        expect(result.current.status).toBe('idle');
    });
});
