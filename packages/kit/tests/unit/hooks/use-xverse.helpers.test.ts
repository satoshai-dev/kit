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
        const onAddressChange = vi.fn();
        const connect = vi.fn().mockResolvedValue(undefined);

        extractAndValidateStacksAddress(undefined, 'SP123', onAddressChange, connect);

        expect(connect).toHaveBeenCalled();
        expect(onAddressChange).not.toHaveBeenCalled();
    });

    it('calls connect when no stacks account found', () => {
        const onAddressChange = vi.fn();
        const connect = vi.fn().mockResolvedValue(undefined);

        extractAndValidateStacksAddress(
            [{ address: 'bc1qxyz', addressType: 'bitcoin', purpose: 'payment' }],
            'SP123',
            onAddressChange,
            connect
        );

        expect(connect).toHaveBeenCalled();
        expect(onAddressChange).not.toHaveBeenCalled();
    });

    it('calls onAddressChange when stacks address differs from current', () => {
        const onAddressChange = vi.fn();
        const connect = vi.fn().mockResolvedValue(undefined);

        extractAndValidateStacksAddress(
            [{ address: 'SP456', addressType: 'stacks', purpose: 'stacks' }],
            'SP123',
            onAddressChange,
            connect
        );

        expect(onAddressChange).toHaveBeenCalledWith('SP456');
        expect(connect).not.toHaveBeenCalled();
    });

    it('does nothing when stacks address matches current', () => {
        const onAddressChange = vi.fn();
        const connect = vi.fn().mockResolvedValue(undefined);

        extractAndValidateStacksAddress(
            [{ address: 'SP123', addressType: 'stacks', purpose: 'stacks' }],
            'SP123',
            onAddressChange,
            connect
        );

        expect(onAddressChange).not.toHaveBeenCalled();
        expect(connect).not.toHaveBeenCalled();
    });

    it('finds stacks account by purpose field', () => {
        const onAddressChange = vi.fn();
        const connect = vi.fn().mockResolvedValue(undefined);

        extractAndValidateStacksAddress(
            [
                { address: 'bc1qxyz', addressType: 'bitcoin', purpose: 'payment' },
                { address: 'SP789', addressType: 'other', purpose: 'stacks' },
            ],
            'SP123',
            onAddressChange,
            connect
        );

        expect(onAddressChange).toHaveBeenCalledWith('SP789');
    });

    it('finds stacks account by addressType field', () => {
        const onAddressChange = vi.fn();
        const connect = vi.fn().mockResolvedValue(undefined);

        extractAndValidateStacksAddress(
            [{ address: 'SP789', addressType: 'stacks', purpose: 'other' }],
            'SP123',
            onAddressChange,
            connect
        );

        expect(onAddressChange).toHaveBeenCalledWith('SP789');
    });
});
