// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/hooks/use-address', () => ({
    useAddress: () => ({
        isConnected: true,
        provider: 'okx',
        address: 'SP123',
    }),
}));

const { useSignMessage } = await import(
    '../../../src/hooks/use-sign-message'
);

const mockOkxSignMessage = vi.fn();

beforeEach(() => {
    mockOkxSignMessage.mockReset();
    vi.stubGlobal('window', {
        ...window,
        okxwallet: { stacks: { signMessage: mockOkxSignMessage } },
    });
});

describe('useSignMessage (OKX)', () => {
    it('calls OKX signMessage with message', async () => {
        const mockResult = { publicKey: 'pk123', signature: 'sig123' };
        mockOkxSignMessage.mockResolvedValue(mockResult);

        const { result } = renderHook(() => useSignMessage());

        await act(async () => {
            await result.current.signMessageAsync({ message: 'hello' });
        });

        expect(mockOkxSignMessage).toHaveBeenCalledWith({ message: 'hello' });
        expect(result.current.data).toEqual(mockResult);
        expect(result.current.isSuccess).toBe(true);
    });

    it('throws when OKX wallet is not found', async () => {
        vi.stubGlobal('window', {
            ...window,
            okxwallet: undefined,
        });

        const { result } = renderHook(() => useSignMessage());

        await act(async () => {
            await expect(
                result.current.signMessageAsync({ message: 'hello' })
            ).rejects.toThrow('OKX wallet not found');
        });

        expect(result.current.isError).toBe(true);
        expect(result.current.error?.message).toBe('OKX wallet not found');
    });

    it('transitions through pending to success', async () => {
        let resolveFn!: (value: unknown) => void;
        mockOkxSignMessage.mockReturnValue(
            new Promise((resolve) => {
                resolveFn = resolve;
            })
        );

        const { result } = renderHook(() => useSignMessage());

        act(() => {
            void result.current.signMessageAsync({ message: 'hello' });
        });

        expect(result.current.isPending).toBe(true);

        await act(async () => {
            resolveFn({ publicKey: 'pk123', signature: 'sig123' });
        });

        expect(result.current.isSuccess).toBe(true);
    });

    it('handles OKX signMessage rejection', async () => {
        mockOkxSignMessage.mockRejectedValue(new Error('User cancelled'));

        const { result } = renderHook(() => useSignMessage());

        await act(async () => {
            await expect(
                result.current.signMessageAsync({ message: 'hello' })
            ).rejects.toThrow('User cancelled');
        });

        expect(result.current.isError).toBe(true);
        expect(result.current.error?.message).toBe('User cancelled');
    });
});
