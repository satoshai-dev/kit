// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
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

vi.mock('../../../src/utils/get-network-from-address', () => ({
    getNetworkFromAddress: () => 'mainnet',
}));

const { useSponsoredContractCall } = await import(
    '../../../src/hooks/use-sponsored-contract-call/use-sponsored-contract-call'
);

const baseVariables = {
    address: 'SP1CONTRACT',
    contract: 'my-contract',
    functionName: 'deposit',
    args: [],
    pc: { postConditions: [], mode: 2 },
};

describe('useSponsoredContractCall (OKX)', () => {
    it('throws UnsupportedMethodError for OKX wallet', async () => {
        const { result } = renderHook(() => useSponsoredContractCall());

        await expect(
            result.current.sponsoredContractCallAsync(baseVariables)
        ).rejects.toThrow(
            'stx_callContract (sponsored) is not supported by OKX wallet'
        );
    });
});
