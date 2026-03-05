import { useState } from 'react';
import { PostConditionMode } from '@stacks/transactions';
import {
    StacksWalletProvider,
    useAddress,
    useConnect,
    useDisconnect,
    useBnsName,
    useWallets,
    useWriteContract,
    useTransferSTX,
    createContractConfig,
} from '@satoshai/kit';

const wcProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;

// Sample SIP-010 token ABI (as const for type inference)
const tokenAbi = {
    functions: [
        {
            name: 'transfer',
            access: 'public',
            args: [
                { name: 'amount', type: 'uint128' },
                { name: 'sender', type: 'principal' },
                { name: 'recipient', type: 'principal' },
                { name: 'memo', type: { optional: { buffer: { length: 34 } } } },
            ],
            outputs: { type: { response: { ok: 'bool', error: 'uint128' } } },
        },
        {
            name: 'get-balance',
            access: 'read_only',
            args: [{ name: 'who', type: 'principal' }],
            outputs: { type: { response: { ok: 'uint128', error: 'none' } } },
        },
    ],
    variables: [],
    maps: [],
    fungible_tokens: [{ name: 'my-token' }],
    non_fungible_tokens: [],
} as const;

// Pre-bind contract config for reuse
const myToken = createContractConfig({
    abi: tokenAbi,
    address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
    contract: 'my-token',
});

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
    const { address, isConnected, provider } = useAddress();
    const { disconnect } = useDisconnect();
    const { bnsName, isLoading: isBnsLoading } = useBnsName(address);
    const { wallets } = useWallets();

    const connectedWallet = wallets.find((w) => w.id === provider);

    if (isConnected) {
        return (
            <div>
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
                <WriteContractDemo address={address} />
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

// Demonstrates useTransferSTX hook
const TransferSTXDemo = () => {
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [memo, setMemo] = useState('');
    const { transferSTX, isPending, isSuccess, isError, data, error, reset } = useTransferSTX();

    const handleTransfer = () => {
        if (!recipient || !amount) return;
        transferSTX(
            {
                recipient,
                amount: BigInt(amount),
                ...(memo && { memo }),
            },
            {
                onSuccess: (txid) => console.log('STX transfer sent:', txid),
                onError: (err) => console.error('STX transfer failed:', err),
            }
        );
    };

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
                <input
                    type="text"
                    placeholder="Memo (optional)"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    disabled={isPending}
                />
                <button onClick={handleTransfer} disabled={isPending || !recipient || !amount}>
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
};

// Demonstrates typed useWriteContract with ABI inference
const WriteContractDemo = ({ address }: { address: string }) => {
    const { writeContract, isPending, isSuccess, isError, data, error } = useWriteContract();

    const handleTransfer = () => {
        // Typed mode: functionName autocompletes, args are type-checked
        writeContract(
            {
                ...myToken,
                functionName: 'transfer', // autocompletes: 'transfer'
                args: {
                    amount: 1000000n,
                    sender: address,
                    recipient: 'SP000000000000000000002Q6VF78',
                    memo: null,
                },
                pc: {
                    postConditions: [],
                    mode: PostConditionMode.Allow,
                },
            },
            {
                onSuccess: (txHash) => console.log('TX sent:', txHash),
                onError: (err) => console.error('TX failed:', err),
            }
        );
    };

    return (
        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            <h3>Write Contract (Typed)</h3>
            <button onClick={handleTransfer} disabled={isPending}>
                {isPending ? 'Sending...' : 'Transfer 1 STX'}
            </button>
            {isSuccess && <p style={{ color: 'green' }}>TX: {data}</p>}
            {isError && <p style={{ color: 'red' }}>Error: {error?.message}</p>}
        </div>
    );
};
