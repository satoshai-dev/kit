import { describe, it, expect } from 'vitest';

import { getNetworkFromAddress } from '../../../src/utils/get-network-from-address';

describe('getNetworkFromAddress', () => {
    it('returns mainnet for SP addresses', () => {
        expect(getNetworkFromAddress('SP2J6Y09RRS07M4QM8CJGKN2QFPGBP3G5BANC0HJ')).toBe('mainnet');
    });

    it('returns mainnet for SM addresses', () => {
        expect(getNetworkFromAddress('SM2J6Y09RRS07M4QM8CJGKN2QFPGBP3G5BANC0HJ')).toBe('mainnet');
    });

    it('returns testnet for ST addresses', () => {
        expect(getNetworkFromAddress('ST2J6Y09RRS07M4QM8CJGKN2QFPGBP3G5BANC0HJ')).toBe('testnet');
    });

    it('returns testnet for SN addresses', () => {
        expect(getNetworkFromAddress('SN2J6Y09RRS07M4QM8CJGKN2QFPGBP3G5BANC0HJ')).toBe('testnet');
    });

    it('throws for invalid address prefix', () => {
        expect(() => getNetworkFromAddress('XX123')).toThrow('Invalid Stacks address: XX123');
    });

    it('throws for empty string', () => {
        expect(() => getNetworkFromAddress('')).toThrow('Invalid Stacks address: ');
    });
});
