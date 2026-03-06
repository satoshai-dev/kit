// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

const { useTransferSTX } = await import(
    '../../../src/hooks/use-transfer-stx'
);

const mockSignTransaction = vi.fn();

beforeEach(() => {
    mockSignTransaction.mockReset();
    vi.stubGlobal('window', {
        ...window,
        okxwallet: { stacks: { signTransaction: mockSignTransaction } },
    });
});

describe('useTransferSTX (OKX)', () => {
    it('calls OKX signTransaction for STX transfer', async () => {
        mockSignTransaction.mockResolvedValue({ txHash: 'okx-tx-123' });

        const { result } = renderHook(() => useTransferSTX());

        await act(async () => {
            await result.current.transferSTXAsync({
                recipient: 'SP456',
                amount: 1000000n,
                memo: 'test',
            });
        });

        expect(mockSignTransaction).toHaveBeenCalledWith({
            txType: 'token_transfer',
            recipient: 'SP456',
            amount: '1000000',
            memo: 'test',
            stxAddress: 'SP123',
            anchorMode: 3,
        });
        expect(result.current.data).toBe('okx-tx-123');
        expect(result.current.isSuccess).toBe(true);
    });

    it('defaults memo to empty string when not provided', async () => {
        mockSignTransaction.mockResolvedValue({ txHash: 'okx-tx-456' });

        const { result } = renderHook(() => useTransferSTX());

        await act(async () => {
            await result.current.transferSTXAsync({
                recipient: 'SP456',
                amount: 500n,
            });
        });

        expect(mockSignTransaction).toHaveBeenCalledWith(
            expect.objectContaining({ memo: '' })
        );
    });

    it('throws WalletNotFoundError when OKX is not installed', async () => {
        vi.stubGlobal('window', {
            ...window,
            okxwallet: undefined,
        });

        const { result } = renderHook(() => useTransferSTX());

        await act(async () => {
            await expect(
                result.current.transferSTXAsync({
                    recipient: 'SP456',
                    amount: 1000000n,
                })
            ).rejects.toThrow('OKX wallet not found');
        });

        expect(result.current.isError).toBe(true);
        expect(result.current.error?.shortMessage).toBe('OKX wallet not found');
    });

    it('handles OKX signTransaction rejection', async () => {
        mockSignTransaction.mockRejectedValue(new Error('User cancelled'));

        const { result } = renderHook(() => useTransferSTX());

        await act(async () => {
            await expect(
                result.current.transferSTXAsync({
                    recipient: 'SP456',
                    amount: 1000000n,
                })
            ).rejects.toThrow('User cancelled');
        });

        expect(result.current.isError).toBe(true);
        expect(result.current.error?.shortMessage).toBe(
            'okx wallet request failed'
        );
    });
});
