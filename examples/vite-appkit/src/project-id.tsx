import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StacksWalletProvider, useAddress, useConnect, useSignMessage } from '@satoshai/kit';

// Regression page: no app AppKit. The kit gets only a projectId, so
// @stacks/connect starts its own AppKit, as before the appKit option.
const walletConnect = { projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string };

const Wallet = () => {
    const { connect, isPending } = useConnect();
    const { address, isConnected, provider } = useAddress();
    const sign = useSignMessage();
    return (
        <main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
            <p data-testid="stx-status">
                {isConnected ? `connected ${provider} ${address}` : isPending ? 'connecting' : 'disconnected'}
            </p>
            <button data-testid="stx-connect-wc" onClick={() => connect('wallet-connect')}>
                Connect WalletConnect
            </button>
            <button data-testid="sign-message" onClick={() => sign.signMessage({ message: 'projectId mode' })}>
                Sign message
            </button>
            <p data-testid="sign-message-result">
                {sign.isSuccess ? `ok ${sign.data?.signature}` : sign.isError ? `error ${sign.error?.message}` : ''}
            </p>
        </main>
    );
};

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <StacksWalletProvider walletConnect={walletConnect}>
            <Wallet />
        </StacksWalletProvider>
    </StrictMode>
);
