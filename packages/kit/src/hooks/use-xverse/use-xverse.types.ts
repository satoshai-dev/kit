export interface XverseAccountChangeEvent {
    type: 'accountChange';
    addresses: {
        address: string;
        publicKey: string;
        purpose: string;
        addressType: string;
        walletType: string;
    }[];
}

export interface WalletConnectResponse {
    jsonrpc: string;
    result: {
        id: string;
        walletType: string;
        addresses: {
            address: string;
            publicKey: string;
            purpose: string;
            addressType: string;
            walletType: string;
        }[];
        network: Record<string, unknown>;
    };
    id: string;
}

export interface XverseStacksProvider {
    addListener(
        event: 'accountChange',
        handler: (event: XverseAccountChangeEvent) => void
    ): () => void;
}
