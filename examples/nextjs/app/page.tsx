'use client';

import { useEffect, useState } from 'react';
import {
    PostConditionMode,
    deserializeTransaction,
    tupleCV,
    stringAsciiCV,
    uintCV,
} from '@stacks/transactions';
import {
    useAddress,
    useConnect,
    useDisconnect,
    useBnsName,
    useWallets,
    useWriteContract,
    useTransferSTX,
    useSignMessage,
    useSignStructuredMessage,
    useSponsoredContractCall,
    createContractConfig,
} from '@satoshai/kit';

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

export default function Home() {
    const { connect, reset, isPending } = useConnect();
    const { address, publicKey, isConnected, provider } = useAddress();
    const { disconnect } = useDisconnect();
    const { bnsName, isLoading: isBnsLoading } = useBnsName(address);
    const { wallets } = useWallets();

    // Prevent hydration mismatch — wallet extension detection only works client-side
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

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
                <p>
                    <strong>Public Key:</strong>{' '}
                    {publicKey ? <code>{publicKey}</code> : <em>not available</em>}
                </p>
                {isBnsLoading ? (
                    <p>Loading BNS name...</p>
                ) : bnsName ? (
                    <p>
                        <strong>BNS:</strong> {bnsName}
                    </p>
                ) : null}
                <SignMessageDemo />
                <TransferSTXDemo />
                <SignStructuredMessageDemo />
                <WriteContractDemo address={address} />
                <SponsoredContractCallDemo address={address} />
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
                {mounted &&
                    wallets.map(({ id, name, icon, webUrl, available }) => (
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
                                <a
                                    href={webUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ fontSize: '0.8rem' }}
                                >
                                    Install
                                </a>
                            )}
                        </div>
                    ))}
            </div>
        </div>
    );
}

function SignMessageDemo() {
    const [message, setMessage] = useState('Hello, Stacks!');
    const { signMessage, isPending, isSuccess, isError, data, error, reset } = useSignMessage();

    const handleSign = () => {
        if (!message) return;
        signMessage(
            { message },
            {
                onSuccess: (result) => console.log('Message signed:', result.signature),
                onError: (err) => console.error('Message signing failed:', err),
            }
        );
    };

    return (
        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            <h3>Sign Message</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '400px' }}>
                <input
                    type="text"
                    placeholder="Message to sign"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={isPending}
                />
                <button onClick={handleSign} disabled={isPending || !message}>
                    {isPending ? 'Signing...' : 'Sign Message'}
                </button>
            </div>
            {isSuccess && (
                <p style={{ color: 'green' }}>
                    Signature: {data?.signature.slice(0, 20)}... <button onClick={reset}>Clear</button>
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

function TransferSTXDemo() {
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
}

function SignStructuredMessageDemo() {
    const { signStructuredMessage, isPending, isSuccess, isError, data, error, reset } =
        useSignStructuredMessage();

    const handleSign = () => {
        signStructuredMessage(
            {
                domain: tupleCV({
                    name: stringAsciiCV('ExampleApp'),
                    version: stringAsciiCV('1.0'),
                    'chain-id': uintCV(1),
                }),
                message: tupleCV({
                    action: stringAsciiCV('authorize'),
                    amount: uintCV(1000),
                }),
            },
            {
                onSuccess: (result) => console.log('Structured message signed:', result.signature),
                onError: (err) => console.error('Structured message signing failed:', err),
            }
        );
    };

    return (
        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            <h3>Sign Structured Message (SIP-018)</h3>
            <button onClick={handleSign} disabled={isPending}>
                {isPending ? 'Signing...' : 'Sign Structured Message'}
            </button>
            {isSuccess && (
                <p style={{ color: 'green' }}>
                    Signature: {data?.signature.slice(0, 20)}... <button onClick={reset}>Clear</button>
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

    const handleTransfer = () => {
        writeContract(
            {
                ...myToken,
                functionName: 'transfer',
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
}

function SponsoredContractCallDemo({ address }: { address: string }) {
    const { sponsoredContractCall, isPending, isSuccess, isError, data, error, reset } =
        useSponsoredContractCall();
    const [verifyResult, setVerifyResult] = useState<
        { ok: true; hash: string } | { ok: false; message: string } | null
    >(null);

    const handleSponsoredCall = () => {
        setVerifyResult(null);
        sponsoredContractCall(
            {
                ...myToken,
                functionName: 'transfer',
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
                onSuccess: (signedTx) => {
                    console.log('Sponsored TX signed:', signedTx);
                    // Run the same verifyOrigin() the sponsor service would run.
                    // Throws if condition.signer (hash160 of declared publicKey)
                    // doesn't match the recovered signature pubkey hash.
                    try {
                        const tx = deserializeTransaction(signedTx);
                        const hash = tx.verifyOrigin();
                        setVerifyResult({ ok: true, hash });
                    } catch (err) {
                        setVerifyResult({
                            ok: false,
                            message: err instanceof Error ? err.message : String(err),
                        });
                    }
                },
                onError: (err) => console.error('Sponsored TX failed:', err),
            }
        );
    };

    return (
        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            <h3>Sponsored Contract Call</h3>
            <p style={{ fontSize: '0.85rem', color: '#666' }}>
                Signs a sponsored contract call (fee = 0) and runs{' '}
                <code>verifyOrigin()</code> client-side. To repro the stale-publicKey bug:
                connect Xverse with account A, switch to account B inside Xverse, then click
                the button. Without the fix, <code>verifyOrigin()</code> throws because the tx
                declares signer = hash160(A) but the signature recovers pubkey B.
            </p>
            <button onClick={handleSponsoredCall} disabled={isPending}>
                {isPending ? 'Signing...' : 'Sign Sponsored Call'}
            </button>
            {isSuccess && data && (
                <div style={{ color: 'green' }}>
                    <p>Signed TX: {data.slice(0, 60)}...</p>
                </div>
            )}
            {verifyResult?.ok && (
                <p style={{ color: 'green' }}>
                    verifyOrigin() passed — origin sig hash: {verifyResult.hash.slice(0, 16)}...{' '}
                    <button onClick={() => { setVerifyResult(null); reset(); }}>Clear</button>
                </p>
            )}
            {verifyResult && !verifyResult.ok && (
                <p style={{ color: 'red' }}>
                    verifyOrigin() FAILED: {verifyResult.message}{' '}
                    <button onClick={() => { setVerifyResult(null); reset(); }}>Clear</button>
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
