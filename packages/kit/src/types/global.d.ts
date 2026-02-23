declare global {
    interface Window {
        okxwallet?: {
            stacks: {
                connect: () => Promise<{ address: string }>;
                signTransaction: (params: {
                    contractAddress: string;
                    contractName: string;
                    functionName: string;
                    functionArgs: string[];
                    postConditions: string[];
                    postConditionMode: number;
                    stxAddress: string;
                    txType: string;
                    anchorMode: number;
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
