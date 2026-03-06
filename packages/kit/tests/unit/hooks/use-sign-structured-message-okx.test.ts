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

const { useSignStructuredMessage } = await import(
    '../../../src/hooks/use-sign-structured-message'
);

const mockDomain = { type: 1 } as any;
const mockMessage = { type: 2 } as any;

describe('useSignStructuredMessage (OKX)', () => {
    it('throws UnsupportedMethodError for OKX wallet', async () => {
        const { result } = renderHook(() => useSignStructuredMessage());

        // UnsupportedMethodError is thrown before state is set (early guard)
        await expect(
            result.current.signStructuredMessageAsync({
                message: mockMessage,
                domain: mockDomain,
            })
        ).rejects.toThrow(
            'stx_signStructuredMessage is not supported by OKX wallet'
        );
    });
});
