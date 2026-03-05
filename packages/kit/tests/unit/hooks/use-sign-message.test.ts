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

const { useSignMessage } = await import(
    '../../../src/hooks/use-sign-message'
);

beforeEach(() => {
    mockRequest.mockReset();
});

describe('useSignMessage', () => {
    it('returns idle state initially', () => {
        const { result } = renderHook(() => useSignMessage());

        expect(result.current.status).toBe('idle');
        expect(result.current.isIdle).toBe(true);
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(false);
        expect(result.current.isError).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.data).toBeUndefined();
    });

    it('transitions to success with data', async () => {
        const mockResult = { publicKey: 'pk123', signature: 'sig123' };
        mockRequest.mockResolvedValue(mockResult);

        const { result } = renderHook(() => useSignMessage());

        await act(async () => {
            await result.current.signMessageAsync({ message: 'hello' });
        });

        expect(result.current.status).toBe('success');
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(mockResult);
        expect(result.current.error).toBeNull();
    });

    it('transitions to error on failure', async () => {
        mockRequest.mockRejectedValue(new Error('User rejected'));

        const { result } = renderHook(() => useSignMessage());

        await act(async () => {
            await expect(
                result.current.signMessageAsync({ message: 'hello' })
            ).rejects.toThrow('User rejected');
        });

        expect(result.current.status).toBe('error');
        expect(result.current.isError).toBe(true);
        expect(result.current.error?.shortMessage).toBe('leather wallet request failed');
        expect(result.current.data).toBeUndefined();
    });

    it('signMessageAsync returns data on success', async () => {
        const mockResult = { publicKey: 'pk123', signature: 'sig123' };
        mockRequest.mockResolvedValue(mockResult);

        const { result } = renderHook(() => useSignMessage());

        let data: unknown;
        await act(async () => {
            data = await result.current.signMessageAsync({
                message: 'hello',
            });
        });

        expect(data).toEqual(mockResult);
    });

    it('calls onSuccess and onSettled callbacks via signMessage', async () => {
        const mockResult = { publicKey: 'pk123', signature: 'sig123' };
        mockRequest.mockResolvedValue(mockResult);

        const onSuccess = vi.fn();
        const onSettled = vi.fn();

        const { result } = renderHook(() => useSignMessage());

        await act(async () => {
            result.current.signMessage(
                { message: 'hello' },
                { onSuccess, onSettled }
            );
            // Wait for the fire-and-forget promise to settle
            await new Promise((r) => setTimeout(r, 0));
        });

        expect(onSuccess).toHaveBeenCalledWith(mockResult);
        expect(onSettled).toHaveBeenCalledWith(mockResult, null);
    });

    it('calls onError and onSettled callbacks on failure via signMessage', async () => {
        mockRequest.mockRejectedValue(new Error('Rejected'));

        const onError = vi.fn();
        const onSettled = vi.fn();

        const { result } = renderHook(() => useSignMessage());

        await act(async () => {
            result.current.signMessage(
                { message: 'hello' },
                { onError, onSettled }
            );
            await new Promise((r) => setTimeout(r, 0));
        });

        expect(onError).toHaveBeenCalledWith(expect.any(Error));
        expect(onSettled).toHaveBeenCalledWith(undefined, expect.any(Error));
    });

    it('reset clears data, error, and status', async () => {
        const mockResult = { publicKey: 'pk123', signature: 'sig123' };
        mockRequest.mockResolvedValue(mockResult);

        const { result } = renderHook(() => useSignMessage());

        await act(async () => {
            await result.current.signMessageAsync({ message: 'hello' });
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

    it('forwards publicKey to request when provided', async () => {
        const mockResult = { publicKey: 'pk123', signature: 'sig123' };
        mockRequest.mockResolvedValue(mockResult);

        const { result } = renderHook(() => useSignMessage());

        await act(async () => {
            await result.current.signMessageAsync({
                message: 'hello',
                publicKey: 'my-pub-key',
            });
        });

        expect(mockRequest).toHaveBeenCalledWith('stx_signMessage', {
            message: 'hello',
            publicKey: 'my-pub-key',
        });
    });

    it('omits publicKey from request when not provided', async () => {
        const mockResult = { publicKey: 'pk123', signature: 'sig123' };
        mockRequest.mockResolvedValue(mockResult);

        const { result } = renderHook(() => useSignMessage());

        await act(async () => {
            await result.current.signMessageAsync({ message: 'hello' });
        });

        expect(mockRequest).toHaveBeenCalledWith('stx_signMessage', {
            message: 'hello',
        });
    });

    it('clears previous error on new call', async () => {
        mockRequest.mockRejectedValue(new Error('First failure'));

        const { result } = renderHook(() => useSignMessage());

        await act(async () => {
            await expect(
                result.current.signMessageAsync({ message: 'hello' })
            ).rejects.toThrow();
        });

        expect(result.current.isError).toBe(true);

        const mockResult = { publicKey: 'pk123', signature: 'sig123' };
        mockRequest.mockResolvedValue(mockResult);

        await act(async () => {
            await result.current.signMessageAsync({ message: 'retry' });
        });

        expect(result.current.isSuccess).toBe(true);
        expect(result.current.error).toBeNull();
        expect(result.current.data).toEqual(mockResult);
    });
});
