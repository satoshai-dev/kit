// @vitest-environment happy-dom
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetPrimaryName = vi.fn();
vi.mock('bns-v2-sdk', () => ({
    getPrimaryName: mockGetPrimaryName,
}));

vi.mock('../../../src/utils/get-network-from-address', () => ({
    getNetworkFromAddress: () => 'mainnet',
}));

const { useBnsName } = await import('../../../src/hooks/use-bns-name');

beforeEach(() => {
    mockGetPrimaryName.mockReset();
});

describe('useBnsName', () => {
    it('returns null and not loading when no address provided', () => {
        const { result } = renderHook(() => useBnsName());

        expect(result.current.bnsName).toBeNull();
        expect(result.current.isLoading).toBe(false);
    });

    it('resolves BNS name in name.namespace format', async () => {
        mockGetPrimaryName.mockResolvedValue({
            name: 'alice',
            namespace: 'btc',
        });

        const { result } = renderHook(() => useBnsName('SP123'));

        await waitFor(() => {
            expect(result.current.bnsName).toBe('alice.btc');
        });

        expect(result.current.isLoading).toBe(false);
    });

    it('returns null when getPrimaryName returns null', async () => {
        mockGetPrimaryName.mockResolvedValue(null);

        const { result } = renderHook(() => useBnsName('SP123'));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.bnsName).toBeNull();
    });

    it('swallows errors and returns null', async () => {
        mockGetPrimaryName.mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useBnsName('SP123'));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.bnsName).toBeNull();
    });

    it('shows loading state while fetching', async () => {
        let resolveFn!: (value: unknown) => void;
        mockGetPrimaryName.mockReturnValue(
            new Promise((resolve) => {
                resolveFn = resolve;
            })
        );

        const { result } = renderHook(() => useBnsName('SP123'));

        await waitFor(() => {
            expect(result.current.isLoading).toBe(true);
        });

        resolveFn({ name: 'alice', namespace: 'btc' });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.bnsName).toBe('alice.btc');
    });

    it('refetches when address changes', async () => {
        mockGetPrimaryName.mockResolvedValue({
            name: 'alice',
            namespace: 'btc',
        });

        const { result, rerender } = renderHook(
            ({ address }) => useBnsName(address),
            { initialProps: { address: 'SP123' } }
        );

        await waitFor(() => {
            expect(result.current.bnsName).toBe('alice.btc');
        });

        mockGetPrimaryName.mockResolvedValue({
            name: 'bob',
            namespace: 'stx',
        });

        rerender({ address: 'SP456' });

        await waitFor(() => {
            expect(result.current.bnsName).toBe('bob.stx');
        });

        expect(mockGetPrimaryName).toHaveBeenCalledTimes(2);
    });

    it('ignores stale fetch when address changes mid-flight', async () => {
        let resolveFirst!: (value: unknown) => void;
        mockGetPrimaryName.mockReturnValue(
            new Promise((resolve) => {
                resolveFirst = resolve;
            })
        );

        const { result, rerender } = renderHook(
            ({ address }) => useBnsName(address),
            { initialProps: { address: 'SP123' } }
        );

        await waitFor(() => {
            expect(result.current.isLoading).toBe(true);
        });

        // Change address before first fetch resolves
        mockGetPrimaryName.mockResolvedValue({
            name: 'bob',
            namespace: 'stx',
        });
        rerender({ address: 'SP456' });

        await waitFor(() => {
            expect(result.current.bnsName).toBe('bob.stx');
        });

        // Resolve stale first fetch — should be ignored
        resolveFirst({ name: 'alice', namespace: 'btc' });
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.bnsName).toBe('bob.stx');
    });

    it('resets to null when address is cleared', async () => {
        mockGetPrimaryName.mockResolvedValue({
            name: 'alice',
            namespace: 'btc',
        });

        const { result, rerender } = renderHook(
            ({ address }) => useBnsName(address),
            { initialProps: { address: 'SP123' as string | undefined } }
        );

        await waitFor(() => {
            expect(result.current.bnsName).toBe('alice.btc');
        });

        rerender({ address: undefined });

        expect(result.current.bnsName).toBeNull();
        expect(result.current.isLoading).toBe(false);
    });
});
