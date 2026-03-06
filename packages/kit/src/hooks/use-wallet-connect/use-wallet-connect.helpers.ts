import type {
    WcUniversalProvider,
    StxAccount,
} from './use-wallet-connect.types';

/**
 * Access the underlying UniversalProvider from the @stacks/connect
 * WalletConnect wrapper. Returns null if not available.
 */
export const getWcUniversalProvider = (): WcUniversalProvider | null =>
    window.WalletConnectProvider?.connector?.provider ?? null;

/**
 * Extract the first Stacks address from an stx_accountChange payload.
 *
 * SIP-030 defines the data as an array of { address, publicKey } objects.
 * The generic WC `accountsChanged` event may carry plain addresses or
 * CAIP-10 strings — this helper handles all three formats.
 */
export const extractStacksAddress = (
    accounts: (StxAccount | string)[],
): string | null => {
    for (const entry of accounts) {
        if (typeof entry === 'object' && entry !== null && 'address' in entry) {
            return entry.address;
        }
        if (typeof entry === 'string') {
            if (entry.startsWith('S')) return entry;
            if (entry.startsWith('stacks:')) return entry.split(':')[2] ?? null;
        }
    }
    return null;
};

const PING_TIMEOUT_MS = 10_000;

/**
 * Ping the wallet via the WC relay to verify the session is still alive.
 * Returns true if alive, false if dead or unreachable.
 * Times out after 10 seconds to avoid the default 5-minute WC timeout.
 */
export const pingSession = async (): Promise<boolean> => {
    const wcProvider = getWcUniversalProvider();
    const client = wcProvider?.client;
    const session = wcProvider?.session;
    if (!client || !session) return false;
    try {
        await Promise.race([
            client.ping({ topic: session.topic }),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Ping timeout')), PING_TIMEOUT_MS)
            ),
        ]);
        return true;
    } catch {
        return false;
    }
};
