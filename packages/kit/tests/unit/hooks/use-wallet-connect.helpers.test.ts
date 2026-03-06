// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
    extractStacksAddress,
    getWcUniversalProvider,
    pingSession,
} from '../../../src/hooks/use-wallet-connect/use-wallet-connect.helpers';

describe('extractStacksAddress', () => {
    it('extracts plain Stacks address starting with S', () => {
        expect(extractStacksAddress(['SP123ABC'])).toBe('SP123ABC');
    });

    it('extracts address from CAIP-10 format', () => {
        expect(extractStacksAddress(['stacks:1:SP123ABC'])).toBe('SP123ABC');
    });

    it('returns null for empty array', () => {
        expect(extractStacksAddress([])).toBeNull();
    });

    it('returns null when no stacks address is present', () => {
        expect(extractStacksAddress(['0xabc', 'bitcoin:1:bc1q'])).toBeNull();
    });

    it('picks the first Stacks address', () => {
        expect(extractStacksAddress(['SP111', 'SP222'])).toBe('SP111');
    });

    it('prefers plain address over CAIP-10 when plain comes first', () => {
        expect(
            extractStacksAddress(['SP111', 'stacks:1:SP222'])
        ).toBe('SP111');
    });

    it('handles mixed formats with non-stacks entries', () => {
        expect(
            extractStacksAddress(['0xabc', 'stacks:1:SP999'])
        ).toBe('SP999');
    });

    it('handles testnet addresses starting with ST', () => {
        expect(extractStacksAddress(['ST123ABC'])).toBe('ST123ABC');
    });

    it('extracts address from SIP-030 account object', () => {
        expect(
            extractStacksAddress([{ address: 'SP123ABC', publicKey: '' }])
        ).toBe('SP123ABC');
    });

    it('picks first SIP-030 object address', () => {
        expect(
            extractStacksAddress([
                { address: 'SP111', publicKey: 'abc' },
                { address: 'SP222', publicKey: 'def' },
            ])
        ).toBe('SP111');
    });

    it('handles mixed objects and strings', () => {
        expect(
            extractStacksAddress(['0xabc', { address: 'SP999', publicKey: '' }])
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
