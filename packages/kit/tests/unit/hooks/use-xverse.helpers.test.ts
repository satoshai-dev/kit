import { describe, it, expect, vi } from 'vitest';

import {
    shouldSupportAccountChange,
    extractAndValidateStacksAddress,
} from '../../../src/hooks/use-xverse/use-xverse.helpers';

describe('shouldSupportAccountChange', () => {
    it('returns false for undefined version', () => {
        expect(shouldSupportAccountChange(undefined)).toBe(false);
    });

    it('returns false for version 1.0.0', () => {
        expect(shouldSupportAccountChange('1.0.0')).toBe(false);
    });

    it('returns true for version 2.0.0', () => {
        expect(shouldSupportAccountChange('2.0.0')).toBe(true);
    });

    it('returns true for any non-1.0.0 version', () => {
        expect(shouldSupportAccountChange('1.0.1')).toBe(true);
        expect(shouldSupportAccountChange('3.5.2')).toBe(true);
    });
});

describe('extractAndValidateStacksAddress', () => {
    it('calls connect when addresses is undefined', () => {
        const onAccountChange = vi.fn();
        const connect = vi.fn().mockResolvedValue(undefined);

        extractAndValidateStacksAddress(undefined, 'SP123', 'pkA', onAccountChange, connect);

        expect(connect).toHaveBeenCalled();
        expect(onAccountChange).not.toHaveBeenCalled();
    });

    it('calls connect when no stacks account found', () => {
        const onAccountChange = vi.fn();
        const connect = vi.fn().mockResolvedValue(undefined);

        extractAndValidateStacksAddress(
            [{ address: 'bc1qxyz', publicKey: 'pkX', addressType: 'bitcoin', purpose: 'payment' }],
            'SP123',
            'pkA',
            onAccountChange,
            connect
        );

        expect(connect).toHaveBeenCalled();
        expect(onAccountChange).not.toHaveBeenCalled();
    });

    it('calls connect when stacks account has no publicKey', () => {
        const onAccountChange = vi.fn();
        const connect = vi.fn().mockResolvedValue(undefined);

        extractAndValidateStacksAddress(
            [{ address: 'SP456', addressType: 'stacks', purpose: 'stacks' }],
            'SP123',
            'pkA',
            onAccountChange,
            connect
        );

        expect(connect).toHaveBeenCalled();
        expect(onAccountChange).not.toHaveBeenCalled();
    });

    it('calls onAccountChange with both fields when address differs', () => {
        const onAccountChange = vi.fn();
        const connect = vi.fn().mockResolvedValue(undefined);

        extractAndValidateStacksAddress(
            [{ address: 'SP456', publicKey: 'pkB', addressType: 'stacks', purpose: 'stacks' }],
            'SP123',
            'pkA',
            onAccountChange,
            connect
        );

        expect(onAccountChange).toHaveBeenCalledWith({
            address: 'SP456',
            publicKey: 'pkB',
            btcAddress: undefined,
            btcPublicKey: undefined,
        });
        expect(connect).not.toHaveBeenCalled();
    });

    it('includes the BTC payment address when the account switches', () => {
        const onAccountChange = vi.fn();
        const connect = vi.fn().mockResolvedValue(undefined);

        extractAndValidateStacksAddress(
            [
                { address: 'bc1qpay', publicKey: 'pkPay', addressType: 'p2wpkh', purpose: 'payment' },
                { address: 'bc1pord', publicKey: 'pkOrd', addressType: 'p2tr', purpose: 'ordinals' },
                { address: 'SP456', publicKey: 'pkB', addressType: 'stacks', purpose: 'stacks' },
            ],
            'SP123',
            'pkA',
            onAccountChange,
            connect
        );

        expect(onAccountChange).toHaveBeenCalledWith({
            address: 'SP456',
            publicKey: 'pkB',
            btcAddress: 'bc1qpay',
            btcPublicKey: 'pkPay',
        });
        expect(connect).not.toHaveBeenCalled();
    });

    it('omits the BTC address on account switch when the payment entry has no public key', () => {
        const onAccountChange = vi.fn();
        const connect = vi.fn().mockResolvedValue(undefined);

        // Mirrors the connect-path rule: a payment entry without a public key
        // yields no BTC address (can't sign a withdrawal without the pubkey).
        extractAndValidateStacksAddress(
            [
                { address: 'bc1qpay', addressType: 'p2wpkh', purpose: 'payment' },
                { address: 'SP456', publicKey: 'pkB', addressType: 'stacks', purpose: 'stacks' },
            ],
            'SP123',
            'pkA',
            onAccountChange,
            connect
        );

        expect(onAccountChange).toHaveBeenCalledWith({
            address: 'SP456',
            publicKey: 'pkB',
            btcAddress: undefined,
            btcPublicKey: undefined,
        });
    });

    it('calls onAccountChange when only publicKey differs', () => {
        const onAccountChange = vi.fn();
        const connect = vi.fn().mockResolvedValue(undefined);

        extractAndValidateStacksAddress(
            [{ address: 'SP123', publicKey: 'pkNew', addressType: 'stacks', purpose: 'stacks' }],
            'SP123',
            'pkOld',
            onAccountChange,
            connect
        );

        expect(onAccountChange).toHaveBeenCalledWith({
            address: 'SP123',
            publicKey: 'pkNew',
            btcAddress: undefined,
            btcPublicKey: undefined,
        });
        expect(connect).not.toHaveBeenCalled();
    });

    it('calls onAccountChange when current publicKey is undefined', () => {
        const onAccountChange = vi.fn();
        const connect = vi.fn().mockResolvedValue(undefined);

        extractAndValidateStacksAddress(
            [{ address: 'SP123', publicKey: 'pkA', addressType: 'stacks', purpose: 'stacks' }],
            'SP123',
            undefined,
            onAccountChange,
            connect
        );

        expect(onAccountChange).toHaveBeenCalledWith({
            address: 'SP123',
            publicKey: 'pkA',
            btcAddress: undefined,
            btcPublicKey: undefined,
        });
        expect(connect).not.toHaveBeenCalled();
    });

    it('does nothing when address and publicKey both match', () => {
        const onAccountChange = vi.fn();
        const connect = vi.fn().mockResolvedValue(undefined);

        extractAndValidateStacksAddress(
            [{ address: 'SP123', publicKey: 'pkA', addressType: 'stacks', purpose: 'stacks' }],
            'SP123',
            'pkA',
            onAccountChange,
            connect
        );

        expect(onAccountChange).not.toHaveBeenCalled();
        expect(connect).not.toHaveBeenCalled();
    });

    it('finds stacks account by purpose field', () => {
        const onAccountChange = vi.fn();
        const connect = vi.fn().mockResolvedValue(undefined);

        extractAndValidateStacksAddress(
            [
                { address: 'bc1qxyz', publicKey: 'pkX', addressType: 'bitcoin', purpose: 'payment' },
                { address: 'SP789', publicKey: 'pkS', addressType: 'other', purpose: 'stacks' },
            ],
            'SP123',
            'pkA',
            onAccountChange,
            connect
        );

        expect(onAccountChange).toHaveBeenCalledWith({
            address: 'SP789',
            publicKey: 'pkS',
            btcAddress: 'bc1qxyz',
            btcPublicKey: 'pkX',
        });
    });

    it('finds stacks account by addressType field', () => {
        const onAccountChange = vi.fn();
        const connect = vi.fn().mockResolvedValue(undefined);

        extractAndValidateStacksAddress(
            [{ address: 'SP789', publicKey: 'pkS', addressType: 'stacks', purpose: 'other' }],
            'SP123',
            'pkA',
            onAccountChange,
            connect
        );

        expect(onAccountChange).toHaveBeenCalledWith({
            address: 'SP789',
            publicKey: 'pkS',
            btcAddress: undefined,
            btcPublicKey: undefined,
        });
    });
});
