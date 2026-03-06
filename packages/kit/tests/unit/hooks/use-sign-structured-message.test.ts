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

const { useSignStructuredMessage } = await import(
    '../../../src/hooks/use-sign-structured-message'
);

beforeEach(() => {
    mockRequest.mockReset();
});

const mockDomain = { type: 1 } as any;
const mockMessage = { type: 2 } as any;

describe('useSignStructuredMessage', () => {
    it('returns idle state initially', () => {
        const { result } = renderHook(() => useSignStructuredMessage());

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

        const { result } = renderHook(() => useSignStructuredMessage());

        await act(async () => {
            await result.current.signStructuredMessageAsync({
                message: mockMessage,
                domain: mockDomain,
            });
        });

        expect(result.current.status).toBe('success');
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(mockResult);
        expect(result.current.error).toBeNull();
    });

    it('calls stx_signStructuredMessage with correct params', async () => {
        mockRequest.mockResolvedValue({ publicKey: 'pk', signature: 'sig' });

        const { result } = renderHook(() => useSignStructuredMessage());

        await act(async () => {
            await result.current.signStructuredMessageAsync({
                message: mockMessage,
                domain: mockDomain,
            });
        });

        expect(mockRequest).toHaveBeenCalledWith('stx_signStructuredMessage', {
            message: mockMessage,
            domain: mockDomain,
        });
    });

    it('transitions to error on failure', async () => {
        mockRequest.mockRejectedValue(new Error('User rejected'));

        const { result } = renderHook(() => useSignStructuredMessage());

        await act(async () => {
            await expect(
                result.current.signStructuredMessageAsync({
                    message: mockMessage,
                    domain: mockDomain,
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
        const mockResult = { publicKey: 'pk123', signature: 'sig123' };
        mockRequest.mockResolvedValue(mockResult);

        const onSuccess = vi.fn();
        const onSettled = vi.fn();

        const { result } = renderHook(() => useSignStructuredMessage());

        await act(async () => {
            result.current.signStructuredMessage(
                { message: mockMessage, domain: mockDomain },
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

        const { result } = renderHook(() => useSignStructuredMessage());

        await act(async () => {
            result.current.signStructuredMessage(
                { message: mockMessage, domain: mockDomain },
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

        const { result } = renderHook(() => useSignStructuredMessage());

        await act(async () => {
            await result.current.signStructuredMessageAsync({
                message: mockMessage,
                domain: mockDomain,
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

        const { result } = renderHook(() => useSignStructuredMessage());

        await act(async () => {
            await expect(
                result.current.signStructuredMessageAsync({
                    message: mockMessage,
                    domain: mockDomain,
                })
            ).rejects.toThrow();
        });

        expect(result.current.isError).toBe(true);

        const mockResult = { publicKey: 'pk123', signature: 'sig123' };
        mockRequest.mockResolvedValue(mockResult);

        await act(async () => {
            await result.current.signStructuredMessageAsync({
                message: mockMessage,
                domain: mockDomain,
            });
        });

        expect(result.current.isSuccess).toBe(true);
        expect(result.current.error).toBeNull();
    });
});
