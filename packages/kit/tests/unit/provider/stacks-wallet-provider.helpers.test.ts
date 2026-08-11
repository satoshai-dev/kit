import { describe, it, expect } from 'vitest';

import { extractBitcoinPaymentAddress } from '../../../src/provider/stacks-wallet-provider.helpers';

// Shapes below mirror the real `getAddresses` payloads captured from each wallet.
describe('extractBitcoinPaymentAddress', () => {
    it('returns undefined for empty addresses', () => {
        expect(extractBitcoinPaymentAddress('xverse', [])).toBeUndefined();
        expect(extractBitcoinPaymentAddress('leather', [])).toBeUndefined();
    });

    describe('xverse', () => {
        const xverseAddresses = [
            { address: 'bc1pord', publicKey: 'pkOrd', purpose: 'ordinals', addressType: 'p2tr' },
            { address: 'bc1qpay', publicKey: 'pkPay', purpose: 'payment', addressType: 'p2wpkh' },
            { address: 'SP123', publicKey: 'pkStx', purpose: 'stacks', addressType: 'stacks' },
        ];

        it('picks the payment (p2wpkh) entry by purpose, not the ordinals one', () => {
            expect(extractBitcoinPaymentAddress('xverse', xverseAddresses)).toEqual({
                address: 'bc1qpay',
                publicKey: 'pkPay',
            });
        });

        it('returns undefined when there is no payment entry', () => {
            const noPayment = xverseAddresses.filter((a) => a.purpose !== 'payment');
            expect(extractBitcoinPaymentAddress('xverse', noPayment)).toBeUndefined();
        });
    });

    describe('leather', () => {
        const leatherAddresses = [
            { symbol: 'BTC', type: 'p2wpkh', address: 'bc1qpay', publicKey: 'pkPay' },
            { symbol: 'BTC', type: 'p2tr', address: 'bc1pord', publicKey: 'pkOrd' },
            { symbol: 'STX', address: 'SP123', publicKey: 'pkStx' },
        ];

        it('picks the BTC p2wpkh entry, not the taproot one', () => {
            expect(extractBitcoinPaymentAddress('leather', leatherAddresses)).toEqual({
                address: 'bc1qpay',
                publicKey: 'pkPay',
            });
        });

        it('returns undefined when only a taproot BTC entry exists', () => {
            const taprootOnly = leatherAddresses.filter((a) => a.type !== 'p2wpkh');
            expect(extractBitcoinPaymentAddress('leather', taprootOnly)).toBeUndefined();
        });
    });

    it('returns undefined for wallets that do not surface a BTC payment address', () => {
        const addresses = [{ symbol: 'STX', address: 'SP123', publicKey: 'pkStx' }];
        for (const provider of ['okx', 'asigna', 'fordefi', 'wallet-connect'] as const) {
            expect(extractBitcoinPaymentAddress(provider, addresses)).toBeUndefined();
        }
    });

    it('returns undefined when the payment entry is missing a public key', () => {
        expect(
            extractBitcoinPaymentAddress('xverse', [
                { address: 'bc1qpay', purpose: 'payment', addressType: 'p2wpkh' },
            ])
        ).toBeUndefined();
    });
});
