// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uintCV, standardPrincipalCV, PostConditionMode } from '@stacks/transactions';
import type { StxPostCondition } from '@stacks/transactions';

const mockRequest = vi.fn();
vi.mock('@stacks/connect', () => ({
    request: mockRequest,
}));

vi.mock('../../../src/hooks/use-address', () => ({
    useAddress: () => ({
        isConnected: true,
        address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
        provider: 'leather',
    }),
}));

vi.mock('../../../src/utils/get-network-from-address', () => ({
    getNetworkFromAddress: () => 'mainnet',
}));

const { useSponsoredContractCall } = await import(
    '../../../src/hooks/use-sponsored-contract-call/use-sponsored-contract-call'
);

const testAbi = {
    functions: [
        {
            name: 'deposit',
            access: 'public',
            args: [
                { name: 'amount', type: 'uint128' },
                { name: 'sender', type: 'principal' },
            ],
            outputs: { type: { response: { ok: 'bool', error: 'uint128' } } },
        },
    ],
    variables: [],
    maps: [],
    fungible_tokens: [],
    non_fungible_tokens: [],
} as const;

const postCondition: StxPostCondition = {
    type: 'stx-postcondition',
    address: 'SP000000000000000000002Q6VF78',
    condition: 'lte',
    amount: 1000000n,
};

const baseVariables = {
    address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
    contract: 'my-contract',
    functionName: 'deposit',
    args: [] as unknown[],
    pc: { postConditions: [postCondition], mode: PostConditionMode.Deny },
};

beforeEach(() => {
    mockRequest.mockReset();
});

describe('useSponsoredContractCall', () => {
    it('returns idle state initially', () => {
        const { result } = renderHook(() => useSponsoredContractCall());

        expect(result.current.status).toBe('idle');
        expect(result.current.isIdle).toBe(true);
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(false);
        expect(result.current.isError).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.data).toBeUndefined();
    });

    it('transitions to success with signed transaction hex', async () => {
        mockRequest.mockResolvedValue({ transaction: '0x0200signed' });

        const { result } = renderHook(() => useSponsoredContractCall());

        await act(async () => {
            await result.current.sponsoredContractCallAsync(baseVariables);
        });

        expect(result.current.status).toBe('success');
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toBe('0x0200signed');
        expect(result.current.error).toBeNull();
    });

    it('formats contract as address.contract', async () => {
        mockRequest.mockResolvedValue({ transaction: '0x0200signed' });

        const { result } = renderHook(() => useSponsoredContractCall());

        await act(async () => {
            await result.current.sponsoredContractCallAsync(baseVariables);
        });

        expect(mockRequest).toHaveBeenCalledWith(
            'stx_callContract',
            expect.objectContaining({
                contract: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.my-contract',
            })
        );
    });

    it('passes sponsored: true and fee: "0" in request', async () => {
        mockRequest.mockResolvedValue({ transaction: '0x0200signed' });

        const { result } = renderHook(() => useSponsoredContractCall());

        await act(async () => {
            await result.current.sponsoredContractCallAsync(baseVariables);
        });

        expect(mockRequest).toHaveBeenCalledWith(
            'stx_callContract',
            expect.objectContaining({
                sponsored: true,
                fee: '0',
            })
        );
    });

    it('maps PostConditionMode.Allow to allow string', async () => {
        mockRequest.mockResolvedValue({ transaction: '0x0200signed' });

        const { result } = renderHook(() => useSponsoredContractCall());

        await act(async () => {
            await result.current.sponsoredContractCallAsync({
                ...baseVariables,
                pc: { postConditions: [], mode: PostConditionMode.Allow },
            });
        });

        expect(mockRequest).toHaveBeenCalledWith(
            'stx_callContract',
            expect.objectContaining({
                postConditionMode: 'allow',
            })
        );
    });

    it('maps PostConditionMode.Deny to deny string', async () => {
        mockRequest.mockResolvedValue({ transaction: '0x0200signed' });

        const { result } = renderHook(() => useSponsoredContractCall());

        await act(async () => {
            await result.current.sponsoredContractCallAsync(baseVariables);
        });

        expect(mockRequest).toHaveBeenCalledWith(
            'stx_callContract',
            expect.objectContaining({
                postConditionMode: 'deny',
            })
        );
    });

    it('passes network from getNetworkFromAddress', async () => {
        mockRequest.mockResolvedValue({ transaction: '0x0200signed' });

        const { result } = renderHook(() => useSponsoredContractCall());

        await act(async () => {
            await result.current.sponsoredContractCallAsync(baseVariables);
        });

        expect(mockRequest).toHaveBeenCalledWith(
            'stx_callContract',
            expect.objectContaining({
                network: 'mainnet',
            })
        );
    });

    it('throws when response has no transaction', async () => {
        mockRequest.mockResolvedValue({});

        const { result } = renderHook(() => useSponsoredContractCall());

        await act(async () => {
            await expect(
                result.current.sponsoredContractCallAsync(baseVariables)
            ).rejects.toThrow('No signed transaction returned');
        });

        expect(result.current.isError).toBe(true);
        expect(result.current.error?.shortMessage).toBe('leather wallet request failed');
    });

    it('transitions to error on failure', async () => {
        mockRequest.mockRejectedValue(new Error('User rejected'));

        const { result } = renderHook(() => useSponsoredContractCall());

        await act(async () => {
            await expect(
                result.current.sponsoredContractCallAsync(baseVariables)
            ).rejects.toThrow('User rejected');
        });

        expect(result.current.status).toBe('error');
        expect(result.current.isError).toBe(true);
        expect(result.current.error?.shortMessage).toBe('leather wallet request failed');
        expect(result.current.data).toBeUndefined();
    });

    it('calls onSuccess and onSettled callbacks via sponsoredContractCall', async () => {
        mockRequest.mockResolvedValue({ transaction: '0x0200signed' });

        const onSuccess = vi.fn();
        const onSettled = vi.fn();

        const { result } = renderHook(() => useSponsoredContractCall());

        await act(async () => {
            result.current.sponsoredContractCall(baseVariables, {
                onSuccess,
                onSettled,
            });
            await new Promise((r) => setTimeout(r, 0));
        });

        expect(onSuccess).toHaveBeenCalledWith('0x0200signed');
        expect(onSettled).toHaveBeenCalledWith('0x0200signed', null);
    });

    it('calls onError and onSettled callbacks on failure via sponsoredContractCall', async () => {
        mockRequest.mockRejectedValue(new Error('Rejected'));

        const onError = vi.fn();
        const onSettled = vi.fn();

        const { result } = renderHook(() => useSponsoredContractCall());

        await act(async () => {
            result.current.sponsoredContractCall(baseVariables, {
                onError,
                onSettled,
            });
            await new Promise((r) => setTimeout(r, 0));
        });

        expect(onError).toHaveBeenCalledWith(expect.any(Error));
        expect(onSettled).toHaveBeenCalledWith(undefined, expect.any(Error));
    });

    it('reset clears data, error, and status', async () => {
        mockRequest.mockResolvedValue({ transaction: '0x0200signed' });

        const { result } = renderHook(() => useSponsoredContractCall());

        await act(async () => {
            await result.current.sponsoredContractCallAsync(baseVariables);
        });

        expect(result.current.data).toBe('0x0200signed');

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

        const { result } = renderHook(() => useSponsoredContractCall());

        await act(async () => {
            await expect(
                result.current.sponsoredContractCallAsync(baseVariables)
            ).rejects.toThrow();
        });

        expect(result.current.isError).toBe(true);

        mockRequest.mockResolvedValue({ transaction: '0x0200signed' });

        await act(async () => {
            await result.current.sponsoredContractCallAsync(baseVariables);
        });

        expect(result.current.isSuccess).toBe(true);
        expect(result.current.error).toBeNull();
        expect(result.current.data).toBe('0x0200signed');
    });
});

describe('useSponsoredContractCall – typed mode (with ABI)', () => {
    it('converts named args to ClarityValues and calls request with sponsored params', async () => {
        mockRequest.mockResolvedValue({ transaction: '0x0200signed' });

        const { result } = renderHook(() => useSponsoredContractCall());

        let signedTx: string | undefined;
        await act(async () => {
            signedTx = await result.current.sponsoredContractCallAsync({
                abi: testAbi,
                address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
                contract: 'my-vault',
                functionName: 'deposit',
                args: {
                    amount: 1000000n,
                    sender: 'SP000000000000000000002Q6VF78',
                },
                pc: baseVariables.pc,
            });
        });

        expect(signedTx).toBe('0x0200signed');
        expect(result.current.isSuccess).toBe(true);

        expect(mockRequest).toHaveBeenCalledWith('stx_callContract', {
            address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
            contract: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.my-vault',
            functionName: 'deposit',
            functionArgs: [
                uintCV(1000000n),
                standardPrincipalCV('SP000000000000000000002Q6VF78'),
            ],
            postConditions: baseVariables.pc.postConditions,
            postConditionMode: 'deny',
            network: 'mainnet',
            sponsored: true,
            fee: '0',
        });
    });

    it('throws when function is not found in ABI', async () => {
        const { result } = renderHook(() => useSponsoredContractCall());

        await act(async () => {
            await expect(
                result.current.sponsoredContractCallAsync({
                    abi: testAbi,
                    address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
                    contract: 'my-vault',
                    functionName: 'nonexistent' as never,
                    args: {} as never,
                    pc: baseVariables.pc,
                })
            ).rejects.toThrow(
                '@satoshai/kit: Public function "nonexistent" not found in ABI'
            );
        });
    });
});

describe('useSponsoredContractCall – untyped mode', () => {
    it('passes ClarityValue[] args directly to request', async () => {
        mockRequest.mockResolvedValue({ transaction: '0x0200signed' });

        const { result } = renderHook(() => useSponsoredContractCall());

        const args = [
            uintCV(1000000n),
            standardPrincipalCV('SP000000000000000000002Q6VF78'),
        ];

        let signedTx: string | undefined;
        await act(async () => {
            signedTx = await result.current.sponsoredContractCallAsync({
                address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
                contract: 'my-vault',
                functionName: 'deposit',
                args,
                pc: baseVariables.pc,
            });
        });

        expect(signedTx).toBe('0x0200signed');
        expect(result.current.isSuccess).toBe(true);

        expect(mockRequest).toHaveBeenCalledWith('stx_callContract', {
            address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
            contract: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.my-vault',
            functionName: 'deposit',
            functionArgs: args,
            postConditions: baseVariables.pc.postConditions,
            postConditionMode: 'deny',
            network: 'mainnet',
            sponsored: true,
            fee: '0',
        });
    });
});
