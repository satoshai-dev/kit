# @satoshai/kit

Typesafe Stacks wallet & contract interaction library for React. Wagmi-inspired hook API for connecting wallets, signing messages, and calling contracts on the Stacks blockchain.

## Features

- **`StacksWalletProvider`** — React context provider for wallet state
- **`useConnect` / `useDisconnect`** — Connect and disconnect wallets
- **`useWallets`** — Configured wallets with availability status
- **`useAddress`** — Access connected wallet address and status
- **`useSignMessage`** — Sign arbitrary messages
- **`useWriteContract`** — Call smart contracts with post-conditions
- **`useTransferSTX`** — Native STX transfers
- **`useBnsName`** — Resolve BNS v2 names
- **6 wallets supported** — Xverse, Leather, OKX, Asigna, Fordefi, WalletConnect
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
  onAddressChange={(newAddress) => {}}                 // optional — Xverse account switching
  onDisconnect={() => {}}                              // optional
>
  {children}
</StacksWalletProvider>
```

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

```ts
const { connect, reset, isPending } = useConnect();

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

```ts
const { disconnect } = useDisconnect();

disconnect();
disconnect(() => { /* callback after disconnect */ });
```

### `useAddress()`

```ts
const { address, isConnected, isConnecting, isDisconnected, provider } = useAddress();

if (isConnected) {
  console.log(address);  // 'SP...' or 'ST...'
  console.log(provider); // 'xverse' | 'leather' | ...
}
```

### `useSignMessage()`

```ts
const { signMessage, signMessageAsync, data, error, isPending } = useSignMessage();

// Callback style
signMessage({ message: 'Hello Stacks' }, {
  onSuccess: ({ publicKey, signature }) => {},
  onError: (error) => {},
});

// Async style
const { publicKey, signature } = await signMessageAsync({ message: 'Hello Stacks' });
```

### `useTransferSTX()`

```ts
const { transferSTX, transferSTXAsync, data, error, isPending } = useTransferSTX();

// Callback style
transferSTX({
  recipient: 'SP2...',
  amount: 1000000n,  // in microSTX
  memo: 'optional memo',
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

```ts
import { Pc, PostConditionMode } from '@stacks/transactions';

const { writeContract, writeContractAsync, data, error, isPending } = useWriteContract();

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

### `useBnsName()`

```ts
const { bnsName, isLoading } = useBnsName(address);
// bnsName = 'satoshi.btc' | null
```

### Utilities

```ts
import { getNetworkFromAddress, getStacksWallets, getLocalStorageWallet } from '@satoshai/kit';

getNetworkFromAddress('SP...');  // 'mainnet'
getNetworkFromAddress('ST...');  // 'testnet'

const { supported, installed } = getStacksWallets();
```

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

## Peer Dependencies

- `react` ^18 or ^19
- `react-dom` ^18 or ^19
- `@stacks/transactions` >=7.0.0

## License

MIT
