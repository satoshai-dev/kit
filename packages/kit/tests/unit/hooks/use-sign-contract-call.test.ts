// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostConditionMode } from '@stacks/transactions';
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

const mockUseAddress = vi.fn();
vi.mock('../../../src/hooks/use-address', () => ({
    useAddress: () => mockUseAddress(),
}));

vi.mock('../../../src/utils/get-network-from-address', () => ({
    getNetworkFromAddress: () => 'mainnet',
}));

const { useSignContractCall } = await import(
    '../../../src/hooks/use-sign-contract-call/use-sign-contract-call'
);

const postCondition: StxPostCondition = {
    type: 'stx-postcondition',
    address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
    condition: 'eq',
    amount: 1000000n,
};

const variables = {
    address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
    contract: 'my-contract',
    functionName: 'deposit',
    args: [] as unknown[],
    pc: {
        postConditions: [postCondition],
        mode: PostConditionMode.Originator,
    },
};

const FAKE_UNSIGNED_TX = { fake: 'unsigned-tx' };
const FAKE_SERIALIZED = '0x00serialized';

beforeEach(() => {
    mockRequest.mockReset();
    mockMakeUnsignedContractCall.mockReset();
    mockSerializeTransaction.mockReset();
    mockUseAddress.mockReturnValue({
        isConnected: true,
        address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
        publicKey: '03abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
        provider: 'xverse',
    });
    mockMakeUnsignedContractCall.mockResolvedValue(FAKE_UNSIGNED_TX);
    mockSerializeTransaction.mockReturnValue(FAKE_SERIALIZED);
});

describe('useSignContractCall', () => {
    it('builds a standard call with the given mode and signs without broadcasting', async () => {
        mockRequest.mockResolvedValue({ transaction: '0x0000signed' });

        const { result } = renderHook(() => useSignContractCall());

        await act(async () => {
            await result.current.signContractCallAsync(variables);
        });

        const built = mockMakeUnsignedContractCall.mock.calls[0][0];
        expect(built).toMatchObject({
            contractAddress: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
            contractName: 'my-contract',
            functionName: 'deposit',
            postConditions: [postCondition],
            postConditionMode: PostConditionMode.Originator,
            network: 'mainnet',
        });
        expect(built).not.toHaveProperty('sponsored');
        expect(built).not.toHaveProperty('fee');

        expect(mockRequest).toHaveBeenCalledWith('stx_signTransaction', {
            transaction: FAKE_SERIALIZED,
            broadcast: false,
        });
        expect(result.current.data).toBe('0x0000signed');
        expect(result.current.isSuccess).toBe(true);
    });

    it('throws UnsupportedMethodError for OKX', async () => {
        mockUseAddress.mockReturnValue({
            isConnected: true,
            address: 'SP123',
            provider: 'okx',
        });

        const { result } = renderHook(() => useSignContractCall());

        await expect(
            result.current.signContractCallAsync(variables)
        ).rejects.toThrow('stx_signTransaction is not supported by OKX wallet');
        expect(mockRequest).not.toHaveBeenCalled();
    });
});
