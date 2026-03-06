// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@stacks/connect', () => ({
    request: vi.fn(),
}));

vi.mock('../../../src/hooks/use-address', () => ({
    useAddress: () => ({
        isConnected: true,
        provider: 'okx',
        address: 'SP123',
    }),
}));

const { useSignTransaction } = await import(
    '../../../src/hooks/use-sign-transaction'
);

describe('useSignTransaction (OKX)', () => {
    it('throws UnsupportedMethodError for OKX wallet', async () => {
        const { result } = renderHook(() => useSignTransaction());

        // UnsupportedMethodError is thrown before state is set (early guard)
        await expect(
            result.current.signTransactionAsync({
                transaction: '0x0100',
            })
        ).rejects.toThrow(
            'stx_signTransaction is not supported by OKX wallet'
        );
    });
});
