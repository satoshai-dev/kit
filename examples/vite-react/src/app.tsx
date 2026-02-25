import {
    StacksWalletProvider,
    useAddress,
    useConnect,
    useDisconnect,
    useBnsName,
    getStacksWallets,
    SUPPORTED_STACKS_WALLETS,
    type SupportedStacksWallet,
} from '@satoshai/kit';

const hasWalletConnectConfig = false;

const isWalletAvailable = (wallet: SupportedStacksWallet) => {
    if (wallet === 'wallet-connect') return hasWalletConnectConfig;
    return getStacksWallets().installed.includes(wallet);
};

export const App = () => {
    return (
        <StacksWalletProvider>
            <div style={{ fontFamily: 'system-ui', padding: '2rem' }}>
                <h1>@satoshai/kit Example</h1>
                <Wallet />
            </div>
        </StacksWalletProvider>
    );
};

const Wallet = () => {
    const { connect, isPending } = useConnect();
    const { address, isConnected } = useAddress();
    const { disconnect } = useDisconnect();
    const { bnsName, isLoading: isBnsLoading } = useBnsName(address);

    if (isConnected) {
        return (
            <div>
                <h2>Connected</h2>
                <p>
                    <strong>Address:</strong> {address}
                </p>
                {isBnsLoading ? (
                    <p>Loading BNS name...</p>
                ) : bnsName ? (
                    <p>
                        <strong>BNS:</strong> {bnsName}
                    </p>
                ) : null}
                <button onClick={() => disconnect()}>Disconnect</button>
            </div>
        );
    }

    return (
        <div>
            <h2>Connect a Wallet</h2>
            {isPending && <p>Connecting...</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '300px' }}>
                {SUPPORTED_STACKS_WALLETS.map((wallet) => {
                    const available = isWalletAvailable(wallet);
                    return (
                        <button
                            key={wallet}
                            onClick={() => connect(wallet)}
                            disabled={isPending || !available}
                        >
                            {wallet}{!available ? ' (not available)' : ''}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
