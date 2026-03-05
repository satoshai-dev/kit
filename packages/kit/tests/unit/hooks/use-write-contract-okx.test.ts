// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@stacks/transactions', () => ({
    PostConditionMode: { Allow: 1, Deny: 2 },
}));

vi.mock('../../../src/hooks/use-address', () => ({
    useAddress: () => ({
        isConnected: true,
        address: 'SP123',
        provider: 'okx',
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

const mockOkxSignTransaction = vi.fn();

const baseVariables = {
    address: 'SP1CONTRACT',
    contract: 'my-contract',
    functionName: 'transfer',
    args: [],
    pc: { postConditions: [], mode: 2 },
};

beforeEach(() => {
    mockOkxSignTransaction.mockReset();
    vi.stubGlobal('window', {
        ...window,
        okxwallet: { stacks: { signTransaction: mockOkxSignTransaction } },
    });
});

describe('useWriteContract (OKX)', () => {
    it('calls OKX signTransaction and returns txHash', async () => {
        mockOkxSignTransaction.mockResolvedValue({ txHash: '0xokx123' });

        const { result } = renderHook(() => useWriteContract());

        let txHash: string | undefined;
        await act(async () => {
            txHash = await result.current.writeContractAsync(baseVariables);
        });

        expect(txHash).toBe('0xokx123');
        expect(result.current.data).toBe('0xokx123');
        expect(result.current.isSuccess).toBe(true);
    });

    it('throws when OKX wallet is not found', async () => {
        vi.stubGlobal('window', {
            ...window,
            okxwallet: undefined,
        });

        const { result } = renderHook(() => useWriteContract());

        await act(async () => {
            await expect(
                result.current.writeContractAsync(baseVariables)
            ).rejects.toThrow('OKX wallet not found');
        });

        expect(result.current.isError).toBe(true);
        expect(result.current.error?.shortMessage).toBe('OKX wallet not found');
    });

    it('passes correct params to OKX signTransaction', async () => {
        mockOkxSignTransaction.mockResolvedValue({ txHash: '0xokx123' });

        const { result } = renderHook(() => useWriteContract());

        await act(async () => {
            await result.current.writeContractAsync(baseVariables);
        });

        expect(mockOkxSignTransaction).toHaveBeenCalledWith({
            contractAddress: 'SP1CONTRACT',
            contractName: 'my-contract',
            functionName: 'transfer',
            functionArgs: [],
            postConditions: [],
            postConditionMode: 2,
            stxAddress: 'SP123',
            txType: 'contract_call',
            anchorMode: 3,
        });
    });

    it('transitions through pending to success', async () => {
        let resolveFn!: (value: unknown) => void;
        mockOkxSignTransaction.mockReturnValue(
            new Promise((resolve) => {
                resolveFn = resolve;
            })
        );

        const { result } = renderHook(() => useWriteContract());

        act(() => {
            void result.current.writeContractAsync(baseVariables);
        });

        expect(result.current.isPending).toBe(true);

        await act(async () => {
            resolveFn({ txHash: '0xokx123' });
        });

        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toBe('0xokx123');
    });
});
