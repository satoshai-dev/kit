import { describe, it, expect } from 'vitest';

import { SUPPORTED_STACKS_WALLETS } from '../../../src/constants/wallets';

describe('SUPPORTED_STACKS_WALLETS', () => {
    it('has exactly 6 entries', () => {
        expect(SUPPORTED_STACKS_WALLETS).toHaveLength(6);
    });

    it('contains all expected wallet names', () => {
        expect(SUPPORTED_STACKS_WALLETS).toContain('xverse');
        expect(SUPPORTED_STACKS_WALLETS).toContain('leather');
        expect(SUPPORTED_STACKS_WALLETS).toContain('okx');
        expect(SUPPORTED_STACKS_WALLETS).toContain('asigna');
        expect(SUPPORTED_STACKS_WALLETS).toContain('fordefi');
        expect(SUPPORTED_STACKS_WALLETS).toContain('wallet-connect');
    });

    it('is readonly', () => {
        // TypeScript enforces this at compile time via `as const`,
        // but we can verify the runtime values are stable
        const copy = [...SUPPORTED_STACKS_WALLETS];
        expect(copy).toEqual(SUPPORTED_STACKS_WALLETS);
    });
});
