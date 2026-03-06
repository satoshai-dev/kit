/**
 * Access the underlying UniversalProvider from the @stacks/connect
 * WalletConnect wrapper. Returns null if not available.
 */
export const getWcUniversalProvider = (): any | null =>
    (window as any).WalletConnectProvider?.connector?.provider ?? null;

/**
 * Extract the Stacks address from a CAIP-10 account ID array.
 * CAIP-10 format: "stacks:<chainId>:<address>"
 */
export const extractStacksAddressFromCaip10 = (
    accounts: string[]
): string | null => {
    const stxAccount = accounts.find((a) => a.startsWith('stacks:'));
    if (!stxAccount) return null;
    return stxAccount.split(':')[2] ?? null;
};

/**
 * Ping the wallet via the WC relay to verify the session is still alive.
 * Returns true if alive, false if dead or unreachable.
 */
export const pingSession = async (): Promise<boolean> => {
    const wcProvider = getWcUniversalProvider();
    const client = wcProvider?.client;
    const session = wcProvider?.session;
    if (!client || !session) return false;
    try {
        await client.ping({ topic: session.topic });
        return true;
    } catch {
        return false;
    }
};
