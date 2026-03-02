import { useState } from 'react';
import {
    StacksWalletProvider,
    useAddress,
    useConnect,
    useDisconnect,
    useBnsName,
    useWallets,
} from '@satoshai/kit';

const wcProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;

export const App = () => {
    const [useModal, setUseModal] = useState(true);

    return (
        <StacksWalletProvider
            connectModal={useModal}
            walletConnect={wcProjectId ? { projectId: wcProjectId } : undefined}
        >
            <div style={{ fontFamily: 'system-ui', padding: '2rem' }}>
                <h1>@satoshai/kit Example</h1>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input
                        type="checkbox"
                        checked={useModal}
                        onChange={(e) => setUseModal(e.target.checked)}
                    />
                    Use @stacks/connect modal
                </label>
                <Wallet useModal={useModal} />
            </div>
        </StacksWalletProvider>
    );
};

const Wallet = ({ useModal }: { useModal: boolean }) => {
    const { connect, reset, isPending } = useConnect();
    const { address, isConnected } = useAddress();
    const { disconnect } = useDisconnect();
    const { bnsName, isLoading: isBnsLoading } = useBnsName(address);
    const { wallets } = useWallets();

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
            {isPending && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <p>Connecting...</p>
                    <button onClick={reset}>Cancel</button>
                </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '300px' }}>
                {useModal && (
                    <button
                        onClick={() => connect()}
                        disabled={isPending}
                        style={{ fontWeight: 'bold' }}
                    >
                        Connect Wallet
                    </button>
                )}
                {wallets.map(({ id, name, icon, webUrl, available }) => (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                            onClick={() => connect(id)}
                            disabled={isPending || !available}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}
                        >
                            {icon && <img src={icon} alt={name} width={20} height={20} />}
                            {name}
                        </button>
                        {!available && webUrl && (
                            <a href={webUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem' }}>
                                Install
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
