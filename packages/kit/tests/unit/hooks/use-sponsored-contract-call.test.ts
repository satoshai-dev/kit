// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uintCV, standardPrincipalCV, PostConditionMode } from '@stacks/transactions';
import type { StxPostCondition } from '@stacks/transactions';

const mockRequest = vi.fn();
vi.mock('@stacks/connect', () => ({
    request: mockRequest,
}));

const mockMakeUnsignedContractCall = vi.fn();
const mockSerializeTransaction = vi.fn();
vi.mock('@stacks/transactions', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@stacks/transactions')>();
    return {
        ...actual,
        makeUnsignedContractCall: (...args: unknown[]) =>
            mockMakeUnsignedContractCall(...args),
        serializeTransaction: (...args: unknown[]) =>
            mockSerializeTransaction(...args),
    };
});

vi.mock('../../../src/hooks/use-address', () => ({
    useAddress: () => ({
        isConnected: true,
        address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
        publicKey: '03abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
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

const FAKE_UNSIGNED_TX = { fake: 'unsigned-tx' };
const FAKE_SERIALIZED = '0x00serialized';

beforeEach(() => {
    mockRequest.mockReset();
    mockMakeUnsignedContractCall.mockReset();
    mockSerializeTransaction.mockReset();

    mockMakeUnsignedContractCall.mockResolvedValue(FAKE_UNSIGNED_TX);
    mockSerializeTransaction.mockReturnValue(FAKE_SERIALIZED);
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

    it('builds unsigned tx with makeUnsignedContractCall and signs via stx_signTransaction', async () => {
        mockRequest.mockResolvedValue({ transaction: '0x0200signed' });

        const { result } = renderHook(() => useSponsoredContractCall());

        await act(async () => {
            await result.current.sponsoredContractCallAsync(baseVariables);
        });

        expect(mockMakeUnsignedContractCall).toHaveBeenCalledWith(
            expect.objectContaining({
                contractAddress: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
                contractName: 'my-contract',
                functionName: 'deposit',
                publicKey: '03abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
                sponsored: true,
                fee: 0,
                network: 'mainnet',
            })
        );

        expect(mockSerializeTransaction).toHaveBeenCalledWith(FAKE_UNSIGNED_TX);

        expect(mockRequest).toHaveBeenCalledWith('stx_signTransaction', {
            transaction: FAKE_SERIALIZED,
            broadcast: false,
        });
    });

    it('passes post conditions to makeUnsignedContractCall', async () => {
        mockRequest.mockResolvedValue({ transaction: '0x0200signed' });

        const { result } = renderHook(() => useSponsoredContractCall());

        await act(async () => {
            await result.current.sponsoredContractCallAsync(baseVariables);
        });

        expect(mockMakeUnsignedContractCall).toHaveBeenCalledWith(
            expect.objectContaining({
                postConditions: [postCondition],
                postConditionMode: PostConditionMode.Deny,
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
    it('converts named args to ClarityValues and builds sponsored tx', async () => {
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

        expect(mockMakeUnsignedContractCall).toHaveBeenCalledWith(
            expect.objectContaining({
                contractAddress: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
                contractName: 'my-vault',
                functionName: 'deposit',
                functionArgs: [
                    uintCV(1000000n),
                    standardPrincipalCV('SP000000000000000000002Q6VF78'),
                ],
                sponsored: true,
                fee: 0,
            })
        );
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
    it('passes ClarityValue[] args directly to makeUnsignedContractCall', async () => {
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

        expect(mockMakeUnsignedContractCall).toHaveBeenCalledWith(
            expect.objectContaining({
                contractAddress: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
                contractName: 'my-vault',
                functionName: 'deposit',
                functionArgs: args,
            })
        );

        expect(mockRequest).toHaveBeenCalledWith('stx_signTransaction', {
            transaction: FAKE_SERIALIZED,
            broadcast: false,
        });
    });
});
