# @satoshai/kit

Typesafe Stacks wallet & contract interaction library for React. Wagmi-inspired hook API for connecting wallets, signing messages, and calling contracts on the Stacks blockchain.

## Features

- **`StacksWalletProvider`** — React context provider for wallet state
- **`useConnect` / `useDisconnect`** — Connect and disconnect wallets
- **`useAddress`** — Access connected wallet address and status
- **`useSignMessage`** — Sign arbitrary messages
- **`useWriteContract`** — Call smart contracts with post-conditions
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
  const { connect, connectors } = useConnect();
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
      {connectors.map((wallet) => (
        <button key={wallet} onClick={() => connect(wallet)}>
          {wallet}
        </button>
      ))}
    </div>
  );
}
```

## API

### `<StacksWalletProvider>`

Wrap your app to provide wallet context to all hooks.

```tsx
<StacksWalletProvider
  walletConnect={{ projectId: '...' }}  // optional — enables WalletConnect
  onConnect={(provider, address) => {}}  // optional
  onAddressChange={(newAddress) => {}}   // optional — Xverse account switching
  onDisconnect={() => {}}                // optional
>
  {children}
</StacksWalletProvider>
```

### `useConnect()`

```ts
const { connect, connectors, isPending } = useConnect();

// connectors = ['xverse', 'leather', 'okx', 'asigna', 'fordefi', 'wallet-connect']
await connect('xverse');
await connect('leather', {
  onSuccess: (address, provider) => {},
  onError: (error) => {},
});
```

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

| Wallet | ID |
|---|---|
| Xverse | `xverse` |
| Leather | `leather` |
| OKX | `okx` |
| Asigna | `asigna` |
| Fordefi | `fordefi` |
| WalletConnect | `wallet-connect` |

## Peer Dependencies

- `react` ^18 or ^19
- `react-dom` ^18 or ^19
- `@stacks/transactions` >=7.0.0

## License

MIT
