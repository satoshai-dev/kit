// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
    extractStacksAddressFromCaip10,
    getWcUniversalProvider,
    pingSession,
} from '../../../src/hooks/use-wallet-connect/use-wallet-connect.helpers';

describe('extractStacksAddressFromCaip10', () => {
    it('extracts address from a stacks CAIP-10 account', () => {
        expect(
            extractStacksAddressFromCaip10(['stacks:1:SP123ABC'])
        ).toBe('SP123ABC');
    });

    it('returns null when no stacks account is present', () => {
        expect(
            extractStacksAddressFromCaip10(['bitcoin:1:bc1qxyz'])
        ).toBeNull();
    });

    it('returns null for empty array', () => {
        expect(extractStacksAddressFromCaip10([])).toBeNull();
    });

    it('picks the first stacks account when multiple exist', () => {
        expect(
            extractStacksAddressFromCaip10([
                'stacks:1:SP111',
                'stacks:2147483648:ST222',
            ])
        ).toBe('SP111');
    });

    it('ignores non-stacks accounts', () => {
        expect(
            extractStacksAddressFromCaip10([
                'ethereum:1:0xabc',
                'stacks:1:SP999',
            ])
        ).toBe('SP999');
    });
});

describe('getWcUniversalProvider', () => {
    beforeEach(() => {
        delete (window as any).WalletConnectProvider;
    });

    it('returns null when WalletConnectProvider is not on window', () => {
        expect(getWcUniversalProvider()).toBeNull();
    });

    it('returns null when connector is missing', () => {
        (window as any).WalletConnectProvider = {};
        expect(getWcUniversalProvider()).toBeNull();
    });

    it('returns the underlying provider', () => {
        const fakeProvider = { on: vi.fn(), off: vi.fn() };
        (window as any).WalletConnectProvider = {
            connector: { provider: fakeProvider },
        };
        expect(getWcUniversalProvider()).toBe(fakeProvider);
    });
});

describe('pingSession', () => {
    beforeEach(() => {
        delete (window as any).WalletConnectProvider;
    });

    it('returns false when provider is not available', async () => {
        expect(await pingSession()).toBe(false);
    });

    it('returns false when client is missing', async () => {
        (window as any).WalletConnectProvider = {
            connector: { provider: { session: { topic: 't1' } } },
        };
        expect(await pingSession()).toBe(false);
    });

    it('returns false when session is missing', async () => {
        (window as any).WalletConnectProvider = {
            connector: { provider: { client: { ping: vi.fn() } } },
        };
        expect(await pingSession()).toBe(false);
    });

    it('returns true when ping succeeds', async () => {
        (window as any).WalletConnectProvider = {
            connector: {
                provider: {
                    client: { ping: vi.fn().mockResolvedValue(undefined) },
                    session: { topic: 'topic123' },
                },
            },
        };
        expect(await pingSession()).toBe(true);
    });

    it('returns false when ping throws', async () => {
        (window as any).WalletConnectProvider = {
            connector: {
                provider: {
                    client: {
                        ping: vi.fn().mockRejectedValue(new Error('timeout')),
                    },
                    session: { topic: 'topic123' },
                },
            },
        };
        expect(await pingSession()).toBe(false);
    });
});
