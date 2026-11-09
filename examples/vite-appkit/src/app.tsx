import { useState } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import { Cl, PostConditionMode } from '@stacks/transactions';
import {
    StacksWalletProvider,
    useAddress,
    useConnect,
    useDisconnect,
    useSignMessage,
    useTransferSTX,
    useWriteContract,
} from '@satoshai/kit';

import type { StacksAppKit } from '@satoshai/kit';

type AppKitLike = StacksAppKit & { open(options?: { namespace?: string }): Promise<unknown> };

export const App = ({ appKit }: { appKit: AppKitLike }) => (
    <StacksWalletProvider walletConnect={{ appKit }}>
        <main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
            <h1>@satoshai/kit + AppKit</h1>
            <BitcoinStatus appKit={appKit} />
            <StacksWallet />
        </main>
    </StacksWalletProvider>
);

const BitcoinStatus = ({ appKit }: { appKit: AppKitLike }) => {
    const { address, isConnected } = useAppKitAccount({ namespace: 'bip122' });
    return (
        <section>
            <h2>Bitcoin (AppKit)</h2>
            <button data-testid="btc-connect" onClick={() => appKit.open({ namespace: 'bip122' })}>
                Open AppKit
            </button>
            <p data-testid="btc-status">{isConnected ? `connected ${address}` : 'disconnected'}</p>
        </section>
    );
};

const StacksWallet = () => {
    const { connect, isPending, error } = useConnect();
    const { address, isConnected, provider } = useAddress();
    const { disconnect } = useDisconnect();

    return (
        <section>
            <h2>Stacks (@satoshai/kit)</h2>
            <p data-testid="stx-status">
                {isConnected ? `connected ${provider} ${address}` : isPending ? 'connecting' : 'disconnected'}
            </p>
            {error && <p data-testid="stx-connect-error">{error.message}</p>}
            {!isConnected && (
                <>
                    <button data-testid="stx-connect-wc" disabled={isPending} onClick={() => connect('wallet-connect')}>
                        Connect WalletConnect
                    </button>
                    <button data-testid="stx-connect-modal" disabled={isPending} onClick={() => connect()}>
                        Connect (modal)
                    </button>
                </>
            )}
            {isConnected && (
                <>
                    <Actions address={address} />
                    <button data-testid="stx-disconnect" onClick={() => disconnect()}>
                        Disconnect
                    </button>
                </>
            )}
        </section>
    );
};

const Actions = ({ address }: { address: string }) => {
    const sign = useSignMessage();
    const transfer = useTransferSTX();
    const write = useWriteContract();
    const [message] = useState('hello from the e2e test');

    return (
        <div style={{ display: 'grid', gap: '0.5rem', maxWidth: 480 }}>
            <button data-testid="sign-message" onClick={() => sign.signMessage({ message })}>
                Sign message
            </button>
            <Result id="sign-message" m={sign} format={(d) => JSON.stringify(d)} />

            <button
                data-testid="transfer-stx"
                onClick={() =>
                    transfer.transferSTX({ recipient: 'SP000000000000000000002Q6VF78', amount: 1n, memo: 'e2e' })
                }
            >
                Transfer STX
            </button>
            <Result id="transfer-stx" m={transfer} format={(d) => String(d)} />

            <button
                data-testid="call-contract"
                onClick={() =>
                    write.writeContract({
                        address: 'SP000000000000000000002Q6VF78',
                        contract: 'pox-4',
                        functionName: 'allow-contract-caller',
                        args: [Cl.principal(address), Cl.none()],
                        pc: { postConditions: [], mode: PostConditionMode.Deny },
                    })
                }
            >
                Call contract
            </button>
            <Result id="call-contract" m={write} format={(d) => String(d)} />
        </div>
    );
};

type Mutation<T> = { isSuccess: boolean; isError: boolean; data?: T; error?: Error | null };

const Result = <T,>({ id, m, format }: { id: string; m: Mutation<T>; format: (d: T) => string }) => (
    <p data-testid={`${id}-result`}>
        {m.isSuccess && m.data !== undefined ? `ok ${format(m.data)}` : m.isError ? `error ${m.error?.message}` : ''}
    </p>
);
