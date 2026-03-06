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

const { useSignTransaction } = await import(
    '../../../src/hooks/use-sign-transaction'
);

beforeEach(() => {
    mockRequest.mockReset();
});

describe('useSignTransaction', () => {
    it('returns idle state initially', () => {
        const { result } = renderHook(() => useSignTransaction());

        expect(result.current.status).toBe('idle');
        expect(result.current.isIdle).toBe(true);
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(false);
        expect(result.current.isError).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.data).toBeUndefined();
    });

    it('transitions to success with data', async () => {
        const mockResult = { transaction: '0xsigned', txid: 'tx123' };
        mockRequest.mockResolvedValue(mockResult);

        const { result } = renderHook(() => useSignTransaction());

        await act(async () => {
            await result.current.signTransactionAsync({
                transaction: '0x0100',
            });
        });

        expect(result.current.status).toBe('success');
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(mockResult);
        expect(result.current.error).toBeNull();
    });

    it('calls stx_signTransaction with transaction only', async () => {
        mockRequest.mockResolvedValue({ transaction: '0xsigned' });

        const { result } = renderHook(() => useSignTransaction());

        await act(async () => {
            await result.current.signTransactionAsync({
                transaction: '0x0100',
            });
        });

        expect(mockRequest).toHaveBeenCalledWith('stx_signTransaction', {
            transaction: '0x0100',
        });
    });

    it('forwards broadcast flag when provided', async () => {
        mockRequest.mockResolvedValue({ transaction: '0xsigned' });

        const { result } = renderHook(() => useSignTransaction());

        await act(async () => {
            await result.current.signTransactionAsync({
                transaction: '0x0100',
                broadcast: false,
            });
        });

        expect(mockRequest).toHaveBeenCalledWith('stx_signTransaction', {
            transaction: '0x0100',
            broadcast: false,
        });
    });

    it('transitions to error on failure', async () => {
        mockRequest.mockRejectedValue(new Error('User rejected'));

        const { result } = renderHook(() => useSignTransaction());

        await act(async () => {
            await expect(
                result.current.signTransactionAsync({
                    transaction: '0x0100',
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
        const mockResult = { transaction: '0xsigned', txid: 'tx123' };
        mockRequest.mockResolvedValue(mockResult);

        const onSuccess = vi.fn();
        const onSettled = vi.fn();

        const { result } = renderHook(() => useSignTransaction());

        await act(async () => {
            result.current.signTransaction(
                { transaction: '0x0100' },
                { onSuccess, onSettled }
            );
            await new Promise((r) => setTimeout(r, 0));
        });

        expect(onSuccess).toHaveBeenCalledWith(mockResult);
        expect(onSettled).toHaveBeenCalledWith(mockResult, null);
    });

    it('calls onError and onSettled callbacks on failure', async () => {
        mockRequest.mockRejectedValue(new Error('Rejected'));

        const onError = vi.fn();
        const onSettled = vi.fn();

        const { result } = renderHook(() => useSignTransaction());

        await act(async () => {
            result.current.signTransaction(
                { transaction: '0x0100' },
                { onError, onSettled }
            );
            await new Promise((r) => setTimeout(r, 0));
        });

        expect(onError).toHaveBeenCalledWith(expect.any(Error));
        expect(onSettled).toHaveBeenCalledWith(undefined, expect.any(Error));
    });

    it('reset clears data, error, and status', async () => {
        const mockResult = { transaction: '0xsigned' };
        mockRequest.mockResolvedValue(mockResult);

        const { result } = renderHook(() => useSignTransaction());

        await act(async () => {
            await result.current.signTransactionAsync({
                transaction: '0x0100',
            });
        });

        expect(result.current.data).toEqual(mockResult);

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

        const { result } = renderHook(() => useSignTransaction());

        await act(async () => {
            await expect(
                result.current.signTransactionAsync({
                    transaction: '0x0100',
                })
            ).rejects.toThrow();
        });

        expect(result.current.isError).toBe(true);

        const mockResult = { transaction: '0xsigned' };
        mockRequest.mockResolvedValue(mockResult);

        await act(async () => {
            await result.current.signTransactionAsync({
                transaction: '0x0100',
            });
        });

        expect(result.current.isSuccess).toBe(true);
        expect(result.current.error).toBeNull();
    });
});
