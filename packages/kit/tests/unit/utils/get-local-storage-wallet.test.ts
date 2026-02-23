import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getLocalStorageWallet } from '../../../src/utils/get-local-storage-wallet';

const mockGetItem = vi.fn();

describe('getLocalStorageWallet', () => {
    beforeEach(() => {
        vi.stubGlobal('window', { localStorage: { getItem: mockGetItem } });
        vi.stubGlobal('localStorage', { getItem: mockGetItem });
        mockGetItem.mockReset();
    });

    it('returns null when window is undefined', () => {
        vi.stubGlobal('window', undefined);
        expect(getLocalStorageWallet()).toBeNull();
    });

    it('returns null when localStorage has no value', () => {
        mockGetItem.mockReturnValue(null);
        expect(getLocalStorageWallet()).toBeNull();
    });

    it('returns null for malformed JSON', () => {
        mockGetItem.mockReturnValue('not-json');
        expect(getLocalStorageWallet()).toBeNull();
    });

    it('returns null for invalid provider', () => {
        mockGetItem.mockReturnValue(
            JSON.stringify({ address: 'SP123', provider: 'unknown-wallet' })
        );
        expect(getLocalStorageWallet()).toBeNull();
    });

    it('returns parsed data for valid wallet', () => {
        const data = { address: 'SP123', provider: 'xverse' };
        mockGetItem.mockReturnValue(JSON.stringify(data));

        expect(getLocalStorageWallet()).toEqual(data);
    });

    it('returns parsed data for all supported providers', () => {
        const providers = ['xverse', 'leather', 'okx', 'asigna', 'fordefi', 'wallet-connect'] as const;

        for (const provider of providers) {
            const data = { address: 'SP123', provider };
            mockGetItem.mockReturnValue(JSON.stringify(data));
            expect(getLocalStorageWallet()).toEqual(data);
        }
    });
});
