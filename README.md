# @satoshai/kit

[![npm version](https://img.shields.io/npm/v/@satoshai/kit)](https://www.npmjs.com/package/@satoshai/kit)
[![CI](https://github.com/satoshai-dev/kit/actions/workflows/ci.yml/badge.svg)](https://github.com/satoshai-dev/kit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Typesafe Stacks wallet & contract interaction library for React. Wagmi-inspired hook API for connecting wallets, signing messages, and calling contracts on the Stacks blockchain.

## Features

- **`StacksWalletProvider`** — React context provider for wallet state
- **`useConnect` / `useDisconnect`** — Connect and disconnect wallets
- **`useWallets`** — Configured wallets with availability status
- **`useAddress`** — Access connected wallet address and status (discriminated union)
- **`useSignMessage`** — Sign arbitrary messages
- **`useSignStructuredMessage`** — Sign SIP-018 structured data
- **`useSignTransaction`** — Sign serialized transactions (sponsored tx flows)
- **`useWriteContract`** — Call smart contracts with post-conditions (typed or untyped)
- **`useTransferSTX`** — Native STX transfers
- **`useBnsName`** — Resolve BNS v2 names
- **Typed errors** — `BaseError`, `WalletNotConnectedError`, `WalletNotFoundError`, `UnsupportedMethodError`, `WalletRequestError`
- **6 wallets supported** — Xverse, Leather, OKX, Asigna, Fordefi, WalletConnect
- **WalletConnect session management** — Zombie session detection, wallet-initiated disconnect, and account change events
- **Next.js App Router compatible** — `"use client"` directives included

## Install

```bash
pnpm add @satoshai/kit @stacks/transactions react react-dom
```

## Quick Start

```tsx
import { StacksWalletProvider, useConnect, useAddress, useDisconnect } from '@satoshai/kit';

function App() {
  return (
    <StacksWalletProvider>
      <Wallet />
    </StacksWalletProvider>
  );
}

function Wallet() {
  const { connect, reset, isPending } = useConnect();
  const { address, isConnected } = useAddress();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div>
        <p>Connected: {address}</p>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    );
  }

  return (
    <div>
      {isPending && <button onClick={reset}>Cancel</button>}
      <button onClick={() => connect()} disabled={isPending}>Connect Wallet</button>
    </div>
  );
}
```

## API

### `<StacksWalletProvider>`

Wrap your app to provide wallet context to all hooks.

```tsx
<StacksWalletProvider
  wallets={['xverse', 'leather', 'wallet-connect']}  // optional — defaults to all supported
  connectModal={true}                                  // optional — defaults to true
  walletConnect={{ projectId: '...' }}                 // optional — enables WalletConnect
  onConnect={(provider, address) => {}}                // optional
  onAddressChange={(newAddress) => {}}                 // optional — Xverse/WalletConnect account switching
  onDisconnect={() => {}}                              // optional
>
  {children}
</StacksWalletProvider>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `wallets` | `SupportedStacksWallet[]` | All 6 wallets | Wallets to enable. |
| `connectModal` | `boolean` | `true` | Show `@stacks/connect` modal on `connect()` with no args. |
| `walletConnect` | `{ projectId, metadata?, chains? }` | — | WalletConnect config. Required when `wallets` includes `'wallet-connect'`. |
| `onConnect` | `(provider, address) => void` | — | Called after successful connection. |
| `onAddressChange` | `(newAddress) => void` | — | Called when the connected account changes. |
| `onDisconnect` | `() => void` | — | Called when the wallet disconnects. |

> If `wallets` includes `'wallet-connect'`, you must provide `walletConnect.projectId` or the provider will throw at mount.

> **Important:** Define `wallets` and `walletConnect` outside of your component (or memoize them) so they remain referentially stable across renders. These values are treated as static configuration.

#### `connectModal` (default: `true`)

Controls whether `connect()` with no arguments shows `@stacks/connect`'s built-in wallet selection modal.

```tsx
// Default — modal handles wallet selection
<StacksWalletProvider>
  <App /> {/* connect() opens the modal */}
</StacksWalletProvider>

// Headless — manage wallet selection yourself (wagmi-style)
<StacksWalletProvider connectModal={false}>
  <App /> {/* connect('xverse') only, connect() with no args is a no-op */}
</StacksWalletProvider>
```

When `connectModal` is enabled:
- `connect()` with no args opens the `@stacks/connect` modal
- `connect('xverse')` with an explicit provider still bypasses the modal
- The `wallets` prop controls which wallets appear in the modal
- All 6 wallets are supported in the modal
- After the user picks a wallet, the kit automatically maps it back and sets state

### `useConnect()`

Connect to a Stacks wallet. Returns a mutation-style object.

```ts
const { connect, reset, error, isPending, isSuccess, isError, isIdle, status } = useConnect();

// Open the @stacks/connect modal (when connectModal is enabled, the default)
await connect();

// Or connect to a specific wallet directly
await connect('xverse');
await connect('leather', {
  onSuccess: (address, provider) => {},
  onError: (error) => {},
});

// Reset stuck connecting state (e.g. when a wallet modal is dismissed)
reset();
```

> **Note:** Some wallets (e.g. OKX) never reject the connection promise when the user closes the popup. Use `reset()` to clear the pending state in those cases.

### `useWallets()`

Returns all configured wallets with their name, icon, download link, and availability status. Metadata is sourced from `@stacks/connect`.

```ts
const { wallets } = useWallets();
// [{ id: 'xverse', name: 'Xverse Wallet', icon: 'data:image/svg+xml;...', webUrl: 'https://xverse.app', available: true }, ...]

{wallets.map(({ id, name, icon, webUrl, available }) => (
  <div key={id}>
    <button onClick={() => connect(id)} disabled={!available}>
      {icon && <img src={icon} alt={name} width={20} height={20} />}
      {name}
    </button>
    {!available && webUrl && <a href={webUrl} target="_blank">Install</a>}
  </div>
))}
```

A wallet is `available` when its browser extension is installed. For `wallet-connect`, it's `available` when a `walletConnect.projectId` is provided to the provider.

### `useDisconnect()`

Disconnect the current wallet and clear the persisted session.

```ts
const { disconnect, reset, error, isSuccess, isError, isIdle, isPending, status } = useDisconnect();

disconnect();
disconnect(() => { /* callback after disconnect */ });
```

### `useAddress()`

Read the connected wallet's address and connection status. Returns a **discriminated union** — when `isConnected` is `true`, `address` and `provider` are narrowed to defined values (no null checks needed).

```ts
const { address, isConnected, isConnecting, isDisconnected, provider } = useAddress();

if (isConnected) {
  console.log(address);  // 'SP...' or 'ST...' — narrowed to string
  console.log(provider); // 'xverse' | 'leather' | ...
}
```

### `useSignMessage()`

Sign an arbitrary plaintext message.

```ts
const { signMessage, signMessageAsync, data, error, isPending, reset } = useSignMessage();

// Callback style
signMessage({ message: 'Hello Stacks' }, {
  onSuccess: ({ publicKey, signature }) => {},
  onError: (error) => {},
  onSettled: (data, error) => {},
});

// Async style
const { publicKey, signature } = await signMessageAsync({ message: 'Hello Stacks' });
```

### `useSignStructuredMessage()`

Sign SIP-018 structured data for typed, verifiable off-chain messages.

> **Note:** OKX wallet does not support structured message signing and will throw an `UnsupportedMethodError`.

```ts
import { tupleCV, stringAsciiCV, uintCV } from '@stacks/transactions';

const { signStructuredMessage, signStructuredMessageAsync, data, error, isPending } = useSignStructuredMessage();

// Callback style
signStructuredMessage({
  domain: tupleCV({
    name: stringAsciiCV('MyApp'),
    version: stringAsciiCV('1.0'),
    'chain-id': uintCV(1),
  }),
  message: tupleCV({
    action: stringAsciiCV('authorize'),
    amount: uintCV(1000),
  }),
}, {
  onSuccess: ({ publicKey, signature }) => {},
  onError: (error) => {},
});

// Async style
const { publicKey, signature } = await signStructuredMessageAsync({
  domain: tupleCV({ ... }),
  message: tupleCV({ ... }),
});
```

### `useTransferSTX()`

Transfer native STX tokens. Amount is in **microSTX** (1 STX = 1,000,000 microSTX).

```ts
const { transferSTX, transferSTXAsync, data, error, isPending, reset } = useTransferSTX();

// Callback style
transferSTX({
  recipient: 'SP2...',
  amount: 1000000n,  // 1 STX
  memo: 'optional memo',
  fee: 2000n,        // optional custom fee
  nonce: 42n,        // optional custom nonce
}, {
  onSuccess: (txid) => {},
  onError: (error) => {},
});

// Async style
const txid = await transferSTXAsync({
  recipient: 'SP2...',
  amount: 1000000n,
});
```

### `useWriteContract()`

Call a public function on a Clarity smart contract. Supports two modes:

#### Untyped mode (ClarityValue[] args)

```ts
import { uintCV, Pc, PostConditionMode } from '@stacks/transactions';

const { writeContract, writeContractAsync, data, error, isPending, reset } = useWriteContract();

writeContract({
  address: 'SP...',
  contract: 'my-contract',
  functionName: 'my-function',
  args: [uintCV(100)],
  pc: {
    postConditions: [Pc.principal('SP...').willSendLte(100n).ustx()],
    mode: PostConditionMode.Deny,
  },
}, {
  onSuccess: (txHash) => {},
  onError: (error) => {},
});
```

#### Typed mode (with ABI — autocomplete + type-checked args)

When you pass an `abi` object, `functionName` is autocompleted from the ABI's public functions and `args` becomes a named, type-checked object.

```ts
import { PostConditionMode } from '@stacks/transactions';
import type { ClarityAbi } from '@satoshai/kit';

// 1. Define your ABI (use @satoshai/abi-cli to generate it)
const poolAbi = { functions: [...], ... } as const satisfies ClarityAbi;

// 2. Call with full type safety
const txid = await writeContractAsync({
  abi: poolAbi,
  address: 'SP...',
  contract: 'pool-v1',
  functionName: 'deposit',     // autocompleted
  args: { amount: 1000000n },  // named args, type-checked
  pc: { postConditions: [], mode: PostConditionMode.Deny },
});
```

#### `createContractConfig()`

Pre-bind ABI + address + contract for reuse across multiple calls:

```ts
import { createContractConfig } from '@satoshai/kit';

const pool = createContractConfig({
  abi: poolAbi,
  address: 'SP...',
  contract: 'pool-v1',
});

// Spread into writeContract — functionName and args stay typed
writeContract({
  ...pool,
  functionName: 'deposit',
  args: { amount: 1000000n },
  pc: { postConditions: [], mode: PostConditionMode.Deny },
});
```

### `useSignTransaction()`

Sign a serialized transaction without automatically broadcasting it. Useful for sponsored transaction flows where a separate service pays the fee.

> **Note:** OKX wallet does not support raw transaction signing and will throw an `UnsupportedMethodError`.

```ts
const { signTransaction, signTransactionAsync, data, error, isPending, reset } = useSignTransaction();

// Callback style
signTransaction({ transaction: '0x0100...', broadcast: false }, {
  onSuccess: ({ transaction, txid }) => {},
  onError: (error) => {},
});

// Async style
const { transaction, txid } = await signTransactionAsync({
  transaction: '0x0100...',
  broadcast: false,
});
```

### `useBnsName()`

Resolve a BNS v2 primary name for a Stacks address. Returns `null` when no name is registered.

```ts
const { bnsName, isLoading } = useBnsName(address);
// bnsName = 'satoshi.btc' | null
```

### Utilities

```ts
import {
  getNetworkFromAddress,
  getStacksWallets,
  getLocalStorageWallet,
  createContractConfig,
} from '@satoshai/kit';

// Infer network from address prefix
getNetworkFromAddress('SP...');  // 'mainnet'
getNetworkFromAddress('ST...');  // 'testnet'

// Detect supported and installed wallets
const { supported, installed } = getStacksWallets();

// Read persisted wallet session (returns null on server or when empty)
const session = getLocalStorageWallet();
// { address: 'SP...', provider: 'xverse' } | null
```

## Mutation Hook Return Types

All mutation hooks (`useConnect`, `useSignMessage`, `useWriteContract`, etc.) return the same status shape:

| Field | Type | Description |
|-------|------|-------------|
| `data` | `T \| undefined` | The successful result. |
| `error` | `BaseError \| null` | The error, if any. |
| `status` | `'idle' \| 'pending' \| 'error' \| 'success'` | Current mutation status. |
| `isIdle` | `boolean` | `true` when no operation has been triggered. |
| `isPending` | `boolean` | `true` while waiting for wallet response. |
| `isSuccess` | `boolean` | `true` after a successful operation. |
| `isError` | `boolean` | `true` after a failed operation. |
| `reset()` | `() => void` | Reset the mutation state back to idle. |

Each hook also provides both a **callback** variant (fire-and-forget with `onSuccess`/`onError`/`onSettled` callbacks) and an **async** variant that returns a promise.

## Error Handling

All errors thrown by hooks extend `BaseError`. You can catch and narrow them:

```ts
import {
  BaseError,
  WalletNotConnectedError,
  WalletNotFoundError,
  UnsupportedMethodError,
  WalletRequestError,
} from '@satoshai/kit';

try {
  await signMessageAsync({ message: 'hello' });
} catch (err) {
  if (err instanceof WalletNotConnectedError) {
    // No wallet connected — prompt user to connect
  } else if (err instanceof UnsupportedMethodError) {
    // Wallet doesn't support this method (e.g. OKX + structured signing)
    console.log(err.method, err.wallet);
  } else if (err instanceof WalletNotFoundError) {
    // Wallet extension not installed
    console.log(err.wallet);
  } else if (err instanceof WalletRequestError) {
    // Wallet rejected or failed — original error in cause
    console.log(err.method, err.wallet, err.cause);
  } else if (err instanceof BaseError) {
    // Any other kit error
    console.log(err.shortMessage);
    console.log(err.walk()); // root cause
  }
}
```

| Error | When |
|-------|------|
| `WalletNotConnectedError` | A mutation hook is called before connecting. |
| `WalletNotFoundError` | A wallet's browser extension is not installed (e.g. OKX). |
| `UnsupportedMethodError` | The wallet doesn't support the requested method. |
| `WalletRequestError` | The wallet rejected or failed the RPC request. |

## WalletConnect Session Management

When using WalletConnect, the kit automatically handles session lifecycle events:

- **Zombie session detection** — On app restore, the relay is pinged (10s timeout). If the wallet on the other end doesn't respond, the session is cleaned up and `onDisconnect` fires.
- **Wallet-initiated disconnect** — If the wallet disconnects via the relay, state is cleaned up automatically.
- **Account changes** — Listens for `accountsChanged`, `stx_accountChange` (SIP-030), and `stx_accountsChanged` events. When the connected account changes, `onAddressChange` fires.

No additional setup is needed — these features activate when `wallets` includes `'wallet-connect'` and a session is active.

## Supported Wallets

All 6 wallets work with both headless (`connect('xverse')`) and modal (`connect()`) modes.

| Wallet | ID |
|---|---|
| Xverse | `xverse` |
| Leather | `leather` |
| Asigna | `asigna` |
| Fordefi | `fordefi` |
| WalletConnect | `wallet-connect` |
| OKX | `okx` |

### Wallet Support Matrix

| Hook | Xverse | Leather | Asigna | Fordefi | WalletConnect | OKX |
|------|--------|---------|--------|---------|---------------|-----|
| `useConnect` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `useSignMessage` | ✓ | ✓ | ? | ? | ~ | ✓ |
| `useSignStructuredMessage` | ✓ | ✓ | ? | ? | ~ | ✗ |
| `useSignTransaction` | ✓ | ✓ | ? | ? | ~ | ✗ |
| `useWriteContract` | ✓ | ✓ | ✓ | ✓ | ~ | ✓ |
| `useTransferSTX` | ✓ | ✓ | ✓ | ✓ | ~ | ✓ |

✓ Confirmed supported | ✗ Unsupported (throws `UnsupportedMethodError`) | ? Unverified | ~ Depends on the connected wallet

**Notes:**

- **OKX** uses a proprietary API (`window.okxwallet.stacks`) instead of the standard `@stacks/connect` RPC. `useSignStructuredMessage` and `useSignTransaction` are explicitly unsupported and will throw `UnsupportedMethodError`.
- **Asigna** is a multisig wallet. Transaction-based hooks (`useWriteContract`, `useTransferSTX`) work, but message signing hooks may be limited since there is no multisig message signature standard on Stacks.
- **Fordefi** supports transactions and contract calls on Stacks, but their [supported blockchains](https://docs.fordefi.com/docs/supported-blockchains) page does not list Stacks under message signing capabilities.
- **WalletConnect** is a relay protocol — all methods are forwarded, but actual support depends on the wallet on the other end.
- **Xverse** and **Leather** implement the full [SIP-030](https://github.com/janniks/sips/blob/main/sips/sip-030/sip-030-wallet-interface.md) interface.

This matrix was compiled from wallet documentation as of March 2026. Sources: [Xverse Sats Connect docs](https://docs.xverse.app/sats-connect/stacks-methods), [Leather developer docs](https://leather.gitbook.io/developers), [Asigna docs](https://asigna.gitbook.io/asigna), [Fordefi docs](https://docs.fordefi.com/docs/supported-blockchains), [@stacks/connect WalletConnect source](https://github.com/stx-labs/connect/tree/main/packages/connect/src/walletconnect).

## Peer Dependencies

- `react` ^18 or ^19
- `react-dom` ^18 or ^19
- `@stacks/transactions` >=7.0.0

## License

MIT
