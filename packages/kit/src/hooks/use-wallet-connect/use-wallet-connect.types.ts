export interface WcDisconnectEvent {
    code: number;
    message: string;
    topic: string;
}

/** CAIP-10 account IDs, e.g. ["stacks:1:SP123..."] */
export type WcAccountsChangedEvent = string[];
