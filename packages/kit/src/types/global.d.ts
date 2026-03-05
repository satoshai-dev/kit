declare global {
    interface Window {
        okxwallet?: {
            stacks: {
                connect: () => Promise<{ address: string }>;
                signTransaction: (params: {
                    stxAddress: string;
                    txType: string;
                    anchorMode: number;
                    // Contract call fields
                    contractAddress?: string;
                    contractName?: string;
                    functionName?: string;
                    functionArgs?: string[];
                    postConditions?: string[];
                    postConditionMode?: number;
                    // Token transfer fields
                    recipient?: string;
                    amount?: string;
                    memo?: string;
                }) => Promise<{ txHash: string }>;
                signMessage: (data: {
                    message: string;
                }) => Promise<{ publicKey: string; signature: string }>;
            };
        };
        XverseProviders?: {
            StacksProvider?: {
                addListener(
                    event: 'accountChange',
                    handler: (event: {
                        type: 'accountChange';
                        addresses: {
                            address: string;
                            publicKey: string;
                            purpose: string;
                            addressType: string;
                            walletType: string;
                        }[];
                    }) => void
                ): () => void;
                getProductInfo?: () => Promise<{
                    version?: string;
                    name?: string;
                }>;
            };
        };
        LeatherProvider?: unknown;
        StacksProvider?: unknown;
        WalletConnectProvider?: unknown;
    }
}

export {};
