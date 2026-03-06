// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRequest = vi.fn();
vi.mock('@stacks/connect', () => ({
    request: mockRequest,
}));

vi.mock('../../../src/hooks/use-address', () => ({
    useAddress: () => ({
        isConnected: true,
        provider: 'leather',
        address: 'SP123',
    }),
}));

vi.mock('../../../src/utils/get-network-from-address', () => ({
    getNetworkFromAddress: () => 'mainnet',
}));

const { useTransferSTX } = await import(
    '../../../src/hooks/use-transfer-stx'
);

beforeEach(() => {
    mockRequest.mockReset();
});

describe('useTransferSTX', () => {
    it('returns idle state initially', () => {
        const { result } = renderHook(() => useTransferSTX());

        expect(result.current.status).toBe('idle');
        expect(result.current.isIdle).toBe(true);
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(false);
        expect(result.current.isError).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.data).toBeUndefined();
    });

    it('transitions to success with txid', async () => {
        mockRequest.mockResolvedValue({ txid: 'tx123' });

        const { result } = renderHook(() => useTransferSTX());

        await act(async () => {
            await result.current.transferSTXAsync({
                recipient: 'SP456',
                amount: 1000000n,
            });
        });

        expect(result.current.status).toBe('success');
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toBe('tx123');
        expect(result.current.error).toBeNull();
    });

    it('calls stx_transferStx with required params', async () => {
        mockRequest.mockResolvedValue({ txid: 'tx123' });

        const { result } = renderHook(() => useTransferSTX());

        await act(async () => {
            await result.current.transferSTXAsync({
                recipient: 'SP456',
                amount: 1000000n,
            });
        });

        expect(mockRequest).toHaveBeenCalledWith('stx_transferStx', {
            recipient: 'SP456',
            amount: 1000000n,
            network: 'mainnet',
        });
    });

    it('forwards optional memo, fee, and nonce', async () => {
        mockRequest.mockResolvedValue({ txid: 'tx123' });

        const { result } = renderHook(() => useTransferSTX());

        await act(async () => {
            await result.current.transferSTXAsync({
                recipient: 'SP456',
                amount: 1000000n,
                memo: 'coffee',
                fee: 2000n,
                nonce: 42n,
            });
        });

        expect(mockRequest).toHaveBeenCalledWith('stx_transferStx', {
            recipient: 'SP456',
            amount: 1000000n,
            memo: 'coffee',
            fee: 2000n,
            nonce: 42n,
            network: 'mainnet',
        });
    });

    it('omits optional params when not provided', async () => {
        mockRequest.mockResolvedValue({ txid: 'tx123' });

        const { result } = renderHook(() => useTransferSTX());

        await act(async () => {
            await result.current.transferSTXAsync({
                recipient: 'SP456',
                amount: 1000000n,
            });
        });

        const callArgs = mockRequest.mock.calls[0]![1];
        expect(callArgs).not.toHaveProperty('memo');
        expect(callArgs).not.toHaveProperty('fee');
        expect(callArgs).not.toHaveProperty('nonce');
    });

    it('throws when response has no txid', async () => {
        mockRequest.mockResolvedValue({});

        const { result } = renderHook(() => useTransferSTX());

        await act(async () => {
            await expect(
                result.current.transferSTXAsync({
                    recipient: 'SP456',
                    amount: 1000000n,
                })
            ).rejects.toThrow('No transaction ID returned');
        });

        expect(result.current.isError).toBe(true);
    });

    it('transitions to error on failure', async () => {
        mockRequest.mockRejectedValue(new Error('User rejected'));

        const { result } = renderHook(() => useTransferSTX());

        await act(async () => {
            await expect(
                result.current.transferSTXAsync({
                    recipient: 'SP456',
                    amount: 1000000n,
                })
            ).rejects.toThrow('User rejected');
        });

        expect(result.current.status).toBe('error');
        expect(result.current.isError).toBe(true);
        expect(result.current.error?.shortMessage).toBe(
            'leather wallet request failed'
        );
    });

    it('calls onSuccess and onSettled callbacks', async () => {
        mockRequest.mockResolvedValue({ txid: 'tx123' });

        const onSuccess = vi.fn();
        const onSettled = vi.fn();

        const { result } = renderHook(() => useTransferSTX());

        await act(async () => {
            result.current.transferSTX(
                { recipient: 'SP456', amount: 1000000n },
                { onSuccess, onSettled }
            );
            await new Promise((r) => setTimeout(r, 0));
        });

        expect(onSuccess).toHaveBeenCalledWith('tx123');
        expect(onSettled).toHaveBeenCalledWith('tx123', null);
    });

    it('calls onError and onSettled callbacks on failure', async () => {
        mockRequest.mockRejectedValue(new Error('Rejected'));

        const onError = vi.fn();
        const onSettled = vi.fn();

        const { result } = renderHook(() => useTransferSTX());

        await act(async () => {
            result.current.transferSTX(
                { recipient: 'SP456', amount: 1000000n },
                { onError, onSettled }
            );
            await new Promise((r) => setTimeout(r, 0));
        });

        expect(onError).toHaveBeenCalledWith(expect.any(Error));
        expect(onSettled).toHaveBeenCalledWith(undefined, expect.any(Error));
    });

    it('reset clears data, error, and status', async () => {
        mockRequest.mockResolvedValue({ txid: 'tx123' });

        const { result } = renderHook(() => useTransferSTX());

        await act(async () => {
            await result.current.transferSTXAsync({
                recipient: 'SP456',
                amount: 1000000n,
            });
        });

        expect(result.current.data).toBe('tx123');

        act(() => {
            result.current.reset();
        });

        expect(result.current.status).toBe('idle');
        expect(result.current.isIdle).toBe(true);
        expect(result.current.data).toBeUndefined();
        expect(result.current.error).toBeNull();
    });

    it('clears previous error on new call', async () => {
        mockRequest.mockRejectedValue(new Error('First failure'));

        const { result } = renderHook(() => useTransferSTX());

        await act(async () => {
            await expect(
                result.current.transferSTXAsync({
                    recipient: 'SP456',
                    amount: 1000000n,
                })
            ).rejects.toThrow();
        });

        expect(result.current.isError).toBe(true);

        mockRequest.mockResolvedValue({ txid: 'tx456' });

        await act(async () => {
            await result.current.transferSTXAsync({
                recipient: 'SP456',
                amount: 1000000n,
            });
        });

        expect(result.current.isSuccess).toBe(true);
        expect(result.current.error).toBeNull();
        expect(result.current.data).toBe('tx456');
    });
});
