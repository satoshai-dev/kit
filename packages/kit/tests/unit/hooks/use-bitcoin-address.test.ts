// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { WalletContextValue } from '../../../src/provider/stacks-wallet-provider.types';

const mockContext: WalletContextValue = {
    status: 'disconnected',
    address: undefined,
    publicKey: undefined,
    btcAddress: undefined,
    btcPublicKey: undefined,
    provider: undefined,
    connect: vi.fn(),
    disconnect: vi.fn(),
    reset: vi.fn(),
    wallets: [],
};

vi.mock('../../../src/provider/stacks-wallet-provider', () => ({
    useStacksWalletContext: () => mockContext,
}));

const { useBitcoinAddress } = await import('../../../src/hooks/use-bitcoin-address');

beforeEach(() => {
    mockContext.status = 'disconnected';
    mockContext.address = undefined;
    mockContext.publicKey = undefined;
    mockContext.btcAddress = undefined;
    mockContext.btcPublicKey = undefined;
    mockContext.provider = undefined;
});

describe('useBitcoinAddress', () => {
    it('is unavailable when disconnected', () => {
        const { result } = renderHook(() => useBitcoinAddress());

        expect(result.current.isAvailable).toBe(false);
        expect(result.current.paymentAddress).toBeUndefined();
        expect(result.current.paymentPublicKey).toBeUndefined();
    });

    it('exposes the payment address and public key when connected', () => {
        Object.assign(mockContext, {
            status: 'connected',
            address: 'SP123',
            publicKey: 'stxPk',
            btcAddress: 'bc1qpay',
            btcPublicKey: 'btcPk',
            provider: 'xverse',
        });

        const { result } = renderHook(() => useBitcoinAddress());

        expect(result.current.isAvailable).toBe(true);
        expect(result.current.paymentAddress).toBe('bc1qpay');
        expect(result.current.paymentPublicKey).toBe('btcPk');
    });

    it('is unavailable when connected to a wallet without a BTC address (e.g. OKX)', () => {
        Object.assign(mockContext, {
            status: 'connected',
            address: 'SP123',
            publicKey: 'stxPk',
            btcAddress: undefined,
            btcPublicKey: undefined,
            provider: 'okx',
        });

        const { result } = renderHook(() => useBitcoinAddress());

        expect(result.current.isAvailable).toBe(false);
        expect(result.current.paymentAddress).toBeUndefined();
    });

    it('is unavailable while connecting', () => {
        mockContext.status = 'connecting';

        const { result } = renderHook(() => useBitcoinAddress());

        expect(result.current.isAvailable).toBe(false);
    });
});
