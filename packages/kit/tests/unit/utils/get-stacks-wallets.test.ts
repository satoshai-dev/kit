import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getStacksWallets, checkIfStacksProviderIsInstalled } from '../../../src/utils/get-stacks-wallets';

describe('getStacksWallets', () => {
    beforeEach(() => {
        vi.stubGlobal('window', {} as Window);
    });

    it('returns all 6 supported wallets', () => {
        const { supported } = getStacksWallets();
        expect(supported).toHaveLength(6);
        expect(supported).toEqual([
            'xverse',
            'leather',
            'asigna',
            'fordefi',
            'wallet-connect',
            'okx',
        ]);
    });

    it('detects installed wallets', () => {
        vi.stubGlobal('window', {
            XverseProviders: {},
            LeatherProvider: {},
        } as unknown as Window);

        const { installed } = getStacksWallets();
        expect(installed).toContain('xverse');
        expect(installed).toContain('leather');
        expect(installed).toContain('wallet-connect');
    });
});

describe('checkIfStacksProviderIsInstalled', () => {
    beforeEach(() => {
        vi.stubGlobal('window', {} as Window);
    });

    it('returns true when window is undefined (SSR)', () => {
        vi.stubGlobal('window', undefined);
        expect(checkIfStacksProviderIsInstalled('xverse')).toBe(true);
    });

    it('detects xverse via XverseProviders', () => {
        vi.stubGlobal('window', { XverseProviders: {} } as unknown as Window);
        expect(checkIfStacksProviderIsInstalled('xverse')).toBe(true);
    });

    it('returns false when xverse not installed', () => {
        expect(checkIfStacksProviderIsInstalled('xverse')).toBe(false);
    });

    it('detects leather via LeatherProvider', () => {
        vi.stubGlobal('window', { LeatherProvider: {} } as unknown as Window);
        expect(checkIfStacksProviderIsInstalled('leather')).toBe(true);
    });

    it('detects leather via HiroWalletProvider', () => {
        vi.stubGlobal('window', { HiroWalletProvider: {} } as unknown as Window);
        expect(checkIfStacksProviderIsInstalled('leather')).toBe(true);
    });

    it('detects okx via okxwallet', () => {
        vi.stubGlobal('window', { okxwallet: {} } as unknown as Window);
        expect(checkIfStacksProviderIsInstalled('okx')).toBe(true);
    });

    it('detects asigna via AsignaProvider', () => {
        vi.stubGlobal('window', { AsignaProvider: {} } as unknown as Window);
        expect(checkIfStacksProviderIsInstalled('asigna')).toBe(true);
    });

    it('detects fordefi via FordefiProviders.UtxoProvider', () => {
        vi.stubGlobal('window', {
            FordefiProviders: { UtxoProvider: {} },
        } as unknown as Window);
        expect(checkIfStacksProviderIsInstalled('fordefi')).toBe(true);
    });

    it('wallet-connect is always available', () => {
        expect(checkIfStacksProviderIsInstalled('wallet-connect')).toBe(true);
    });
});
