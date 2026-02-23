# @satoshai/kit

[![npm version](https://img.shields.io/npm/v/@satoshai/kit)](https://www.npmjs.com/package/@satoshai/kit)
[![CI](https://github.com/satoshai-dev/kit/actions/workflows/ci.yml/badge.svg)](https://github.com/satoshai-dev/kit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Typesafe Stacks wallet & contract interaction library for React. Wagmi-inspired hook API for connecting wallets, signing messages, and calling contracts on the Stacks blockchain.

## Features

- **`StacksWalletProvider`** — React context provider for wallet state
- **`useConnect` / `useDisconnect`** — Connect and disconnect wallets
- **`useAddress`** — Access connected wallet address and status
- **`useSignMessage`** — Sign arbitrary messages
- **`useWriteContract`** — Call smart contracts with post-conditions
- **`useBnsName`** — Resolve BNS v2 names
- **6 wallets supported** — Xverse, Leather, OKX, Asigna, Fordefi, WalletConnect

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

## License

MIT
