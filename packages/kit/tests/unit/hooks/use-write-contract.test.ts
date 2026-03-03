// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRequest = vi.fn();
vi.mock('@stacks/connect', () => ({
    request: mockRequest,
}));

vi.mock('@stacks/transactions', () => ({
    PostConditionMode: { Allow: 1, Deny: 2 },
}));

vi.mock('../../../src/hooks/use-address', () => ({
    useAddress: () => ({
        isConnected: true,
        address: 'SP123',
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

const baseVariables = {
    address: 'SP1CONTRACT',
    contract: 'my-contract',
    functionName: 'transfer',
    args: [],
    pc: { postConditions: [], mode: 2 }, // Deny
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
                contract: 'SP1CONTRACT.my-contract',
            })
        );
    });

    it('maps PostConditionMode.Allow to allow string', async () => {
        mockRequest.mockResolvedValue({ txid: '0xabc123' });

        const { result } = renderHook(() => useWriteContract());

        await act(async () => {
            await result.current.writeContractAsync({
                ...baseVariables,
                pc: { postConditions: [], mode: 1 }, // Allow
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
