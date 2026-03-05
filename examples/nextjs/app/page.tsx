'use client';

import { useState } from 'react';
import { PostConditionMode, uintCV } from '@stacks/transactions';
import {
    useAddress,
    useConnect,
    useDisconnect,
    useBnsName,
    useWallets,
    useWriteContract,
    useTransferSTX,
} from '@satoshai/kit';

export default function Home() {
    const { connect, reset, isPending } = useConnect();
    const { address, isConnected, provider } = useAddress();
    const { disconnect } = useDisconnect();
    const { bnsName, isLoading: isBnsLoading } = useBnsName(address);
    const { wallets } = useWallets();

    const connectedWallet = wallets.find((w) => w.id === provider);

    if (isConnected) {
        return (
            <div>
                <h1>@satoshai/kit — Next.js</h1>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {connectedWallet?.icon && (
                        <img src={connectedWallet.icon} alt={connectedWallet.name} width={24} height={24} />
                    )}
                    Connected via {connectedWallet?.name ?? provider}
                </h2>
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
                <TransferSTXDemo />
                <WriteContractDemo address={address!} />
                <button onClick={() => disconnect()}>Disconnect</button>
            </div>
        );
    }

    return (
        <div>
            <h1>@satoshai/kit — Next.js</h1>
            <h2>Connect a Wallet</h2>
            {isPending && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <p>Connecting...</p>
                    <button onClick={reset}>Cancel</button>
                </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '300px' }}>
                <button onClick={() => connect()} disabled={isPending} style={{ fontWeight: 'bold' }}>
                    Connect Wallet
                </button>
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
}

function TransferSTXDemo() {
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const { transferSTX, isPending, isSuccess, isError, data, error, reset } = useTransferSTX();

    return (
        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            <h3>Transfer STX</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '400px' }}>
                <input
                    type="text"
                    placeholder="Recipient address (SP...)"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    disabled={isPending}
                />
                <input
                    type="text"
                    placeholder="Amount (microSTX)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isPending}
                />
                <button
                    onClick={() =>
                        transferSTX(
                            { recipient, amount: BigInt(amount) },
                            { onSuccess: (txid) => console.log('TX:', txid) }
                        )
                    }
                    disabled={isPending || !recipient || !amount}
                >
                    {isPending ? 'Sending...' : 'Send STX'}
                </button>
            </div>
            {isSuccess && (
                <p style={{ color: 'green' }}>
                    TX: {data} <button onClick={reset}>Clear</button>
                </p>
            )}
            {isError && (
                <p style={{ color: 'red' }}>
                    Error: {error?.message} <button onClick={reset}>Clear</button>
                </p>
            )}
        </div>
    );
}

function WriteContractDemo({ address }: { address: string }) {
    const { writeContract, isPending, isSuccess, isError, data, error } = useWriteContract();

    return (
        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            <h3>Write Contract</h3>
            <button
                onClick={() =>
                    writeContract(
                        {
                            address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
                            contract: 'my-token',
                            functionName: 'transfer',
                            args: [uintCV(1000000n)],
                            pc: { postConditions: [], mode: PostConditionMode.Allow },
                        },
                        { onSuccess: (txHash) => console.log('TX:', txHash) }
                    )
                }
                disabled={isPending}
            >
                {isPending ? 'Sending...' : 'Call Contract'}
            </button>
            {isSuccess && <p style={{ color: 'green' }}>TX: {data}</p>}
            {isError && <p style={{ color: 'red' }}>Error: {error?.message}</p>}
        </div>
    );
}
