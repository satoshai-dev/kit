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

vi.mock(
    '../../../src/hooks/use-write-contract/use-write-contract.helpers',
    () => ({
        prepareArgsForOKX: vi.fn((args: unknown[]) => args),
        preparePostConditionsForOKX: vi.fn((pcs: unknown[]) => pcs),
    })
);

const { useWriteContract } = await import(
    '../../../src/hooks/use-write-contract/use-write-contract'
);

const testAbi = {
    functions: [
        {
            name: 'transfer',
            access: 'public',
            args: [
                { name: 'amount', type: 'uint128' },
                { name: 'sender', type: 'principal' },
            ],
            outputs: { type: { response: { ok: 'bool', error: 'uint128' } } },
        },
        {
            name: 'get-balance',
            access: 'read_only',
            args: [{ name: 'who', type: 'principal' }],
            outputs: { type: { response: { ok: 'uint128', error: 'none' } } },
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
    functionName: 'transfer',
    args: [] as unknown[],
    pc: { postConditions: [postCondition], mode: PostConditionMode.Deny },
};

beforeEach(() => {
    mockRequest.mockReset();
});

describe('useWriteContract', () => {
    it('returns idle state initially', () => {
        const { result } = renderHook(() => useWriteContract());

        expect(result.current.status).toBe('idle');
        expect(result.current.isIdle).toBe(true);
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(false);
        expect(result.current.isError).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.data).toBeUndefined();
    });

    it('transitions to success with txid', async () => {
        mockRequest.mockResolvedValue({ txid: '0xabc123' });

        const { result } = renderHook(() => useWriteContract());

        await act(async () => {
            await result.current.writeContractAsync(baseVariables);
        });

        expect(result.current.status).toBe('success');
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toBe('0xabc123');
        expect(result.current.error).toBeNull();
    });

    it('formats contract as address.contract', async () => {
        mockRequest.mockResolvedValue({ txid: '0xabc123' });

        const { result } = renderHook(() => useWriteContract());

        await act(async () => {
            await result.current.writeContractAsync(baseVariables);
        });

        expect(mockRequest).toHaveBeenCalledWith(
            'stx_callContract',
            expect.objectContaining({
                contract: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.my-contract',
            })
        );
    });

    it('maps PostConditionMode.Allow to allow string', async () => {
        mockRequest.mockResolvedValue({ txid: '0xabc123' });

        const { result } = renderHook(() => useWriteContract());

        await act(async () => {
            await result.current.writeContractAsync({
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
        mockRequest.mockResolvedValue({ txid: '0xabc123' });

        const { result } = renderHook(() => useWriteContract());

        await act(async () => {
            await result.current.writeContractAsync(baseVariables);
        });

        expect(mockRequest).toHaveBeenCalledWith(
            'stx_callContract',
            expect.objectContaining({
                postConditionMode: 'deny',
            })
        );
    });

    it('passes network from getNetworkFromAddress', async () => {
        mockRequest.mockResolvedValue({ txid: '0xabc123' });

        const { result } = renderHook(() => useWriteContract());

        await act(async () => {
            await result.current.writeContractAsync(baseVariables);
        });

        expect(mockRequest).toHaveBeenCalledWith(
            'stx_callContract',
            expect.objectContaining({
                network: 'mainnet',
            })
        );
    });

    it('throws when response has no txid', async () => {
        mockRequest.mockResolvedValue({});

        const { result } = renderHook(() => useWriteContract());

        await act(async () => {
            await expect(
                result.current.writeContractAsync(baseVariables)
            ).rejects.toThrow('No transaction ID returned');
        });

        expect(result.current.isError).toBe(true);
        expect(result.current.error?.message).toBe(
            'No transaction ID returned'
        );
    });

    it('transitions to error on failure', async () => {
        mockRequest.mockRejectedValue(new Error('User rejected'));

        const { result } = renderHook(() => useWriteContract());

        await act(async () => {
            await expect(
                result.current.writeContractAsync(baseVariables)
            ).rejects.toThrow('User rejected');
        });

        expect(result.current.status).toBe('error');
        expect(result.current.isError).toBe(true);
        expect(result.current.error?.message).toBe('User rejected');
        expect(result.current.data).toBeUndefined();
    });

    it('calls onSuccess and onSettled callbacks via writeContract', async () => {
        mockRequest.mockResolvedValue({ txid: '0xabc123' });

        const onSuccess = vi.fn();
        const onSettled = vi.fn();

        const { result } = renderHook(() => useWriteContract());

        await act(async () => {
            result.current.writeContract(baseVariables, {
                onSuccess,
                onSettled,
            });
            await new Promise((r) => setTimeout(r, 0));
        });

        expect(onSuccess).toHaveBeenCalledWith('0xabc123');
        expect(onSettled).toHaveBeenCalledWith('0xabc123', null);
    });

    it('calls onError and onSettled callbacks on failure via writeContract', async () => {
        mockRequest.mockRejectedValue(new Error('Rejected'));

        const onError = vi.fn();
        const onSettled = vi.fn();

        const { result } = renderHook(() => useWriteContract());

        await act(async () => {
            result.current.writeContract(baseVariables, {
                onError,
                onSettled,
            });
            await new Promise((r) => setTimeout(r, 0));
        });

        expect(onError).toHaveBeenCalledWith(expect.any(Error));
        expect(onSettled).toHaveBeenCalledWith(undefined, expect.any(Error));
    });

    it('reset clears data, error, and status', async () => {
        mockRequest.mockResolvedValue({ txid: '0xabc123' });

        const { result } = renderHook(() => useWriteContract());

        await act(async () => {
            await result.current.writeContractAsync(baseVariables);
        });

        expect(result.current.data).toBe('0xabc123');

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

        const { result } = renderHook(() => useWriteContract());

        await act(async () => {
            await expect(
                result.current.writeContractAsync(baseVariables)
            ).rejects.toThrow();
        });

        expect(result.current.isError).toBe(true);

        mockRequest.mockResolvedValue({ txid: '0xabc123' });

        await act(async () => {
            await result.current.writeContractAsync(baseVariables);
        });

        expect(result.current.isSuccess).toBe(true);
        expect(result.current.error).toBeNull();
        expect(result.current.data).toBe('0xabc123');
    });
});

describe('useWriteContract – typed mode (with ABI)', () => {
    it('converts named args to ClarityValues and calls request', async () => {
        mockRequest.mockResolvedValue({ txid: '0xabc123' });

        const { result } = renderHook(() => useWriteContract());

        let txHash: string | undefined;
        await act(async () => {
            txHash = await result.current.writeContractAsync({
                abi: testAbi,
                address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
                contract: 'my-token',
                functionName: 'transfer',
                args: {
                    amount: 1000000n,
                    sender: 'SP000000000000000000002Q6VF78',
                },
                pc: baseVariables.pc,
            });
        });

        expect(txHash).toBe('0xabc123');
        expect(result.current.isSuccess).toBe(true);

        expect(mockRequest).toHaveBeenCalledWith('stx_callContract', {
            address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
            contract: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.my-token',
            functionName: 'transfer',
            functionArgs: [
                uintCV(1000000n),
                standardPrincipalCV('SP000000000000000000002Q6VF78'),
            ],
            postConditions: baseVariables.pc.postConditions,
            postConditionMode: 'deny',
            network: 'mainnet',
        });
    });

    it('throws when function is not found in ABI', async () => {
        const { result } = renderHook(() => useWriteContract());

        await act(async () => {
            await expect(
                result.current.writeContractAsync({
                    abi: testAbi,
                    address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
                    contract: 'my-token',
                    functionName: 'nonexistent' as never,
                    args: {} as never,
                    pc: baseVariables.pc,
                })
            ).rejects.toThrow(
                '@satoshai/kit: Public function "nonexistent" not found in ABI'
            );
        });
    });

    it('throws when function is read_only (not public)', async () => {
        const { result } = renderHook(() => useWriteContract());

        await act(async () => {
            await expect(
                result.current.writeContractAsync({
                    abi: testAbi,
                    address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
                    contract: 'my-token',
                    functionName: 'get-balance' as never,
                    args: {} as never,
                    pc: baseVariables.pc,
                })
            ).rejects.toThrow(
                '@satoshai/kit: Public function "get-balance" not found in ABI'
            );
        });
    });
});

describe('useWriteContract – untyped mode (backward compatible)', () => {
    it('passes ClarityValue[] args directly to request', async () => {
        mockRequest.mockResolvedValue({ txid: '0xdef456' });

        const { result } = renderHook(() => useWriteContract());

        const args = [
            uintCV(1000000n),
            standardPrincipalCV('SP000000000000000000002Q6VF78'),
        ];

        let txHash: string | undefined;
        await act(async () => {
            txHash = await result.current.writeContractAsync({
                address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
                contract: 'my-token',
                functionName: 'transfer',
                args,
                pc: baseVariables.pc,
            });
        });

        expect(txHash).toBe('0xdef456');
        expect(result.current.isSuccess).toBe(true);

        expect(mockRequest).toHaveBeenCalledWith('stx_callContract', {
            address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
            contract: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.my-token',
            functionName: 'transfer',
            functionArgs: args,
            postConditions: baseVariables.pc.postConditions,
            postConditionMode: 'deny',
            network: 'mainnet',
        });
    });
});
