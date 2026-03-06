export interface WcDisconnectEvent {
    code: number;
    message: string;
    topic: string;
}

/** CAIP-10 account IDs, e.g. ["stacks:1:SP123..."] */
export type WcAccountsChangedEvent = string[];

export interface WcSession {
    topic: string;
}

export interface WcSignClient {
    ping: (params: { topic: string }) => Promise<void>;
}

export interface WcUniversalProvider {
    on: (event: string, handler: (...args: unknown[]) => void) => void;
    off: (event: string, handler: (...args: unknown[]) => void) => void;
    disconnect: () => Promise<void>;
    client?: WcSignClient;
    session?: WcSession;
}

export interface WcStacksConnectProvider {
    connector?: {
        provider?: WcUniversalProvider;
    };
}
