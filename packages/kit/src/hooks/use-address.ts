'use client';

import { useMemo } from 'react';

import type { SupportedStacksWallet } from '../constants/wallets';
import { useStacksWalletContext } from '../provider/stacks-wallet-provider';

type UseAddressReturn =
    | {
          address: undefined;
          isConnected: false;
          isConnecting: boolean;
          isDisconnected: boolean;
          provider: undefined;
      }
    | {
          address: string;
          isConnected: true;
          isConnecting: false;
          isDisconnected: false;
          provider: SupportedStacksWallet;
      };

/**
 * Read the connected wallet's address and connection status.
 *
 * Returns a discriminated union — when `isConnected` is `true`, `address`
 * and `provider` are guaranteed to be defined (no null checks needed).
 *
 * @example
 * ```ts
 * const { address, isConnected, provider } = useAddress();
 *
 * if (isConnected) {
 *   console.log(address);  // 'SP...' — narrowed to string
 *   console.log(provider); // 'xverse' | 'leather' | ...
 * }
 * ```
 */
export const useAddress = (): UseAddressReturn => {
    const { address, status, provider } = useStacksWalletContext();

    return useMemo(() => {
        if (status === 'connected' && address && provider) {
            return {
                address,
                isConnected: true as const,
                isConnecting: false as const,
                isDisconnected: false as const,
                provider,
            };
        }

        return {
            address: undefined,
            isConnected: false as const,
            isConnecting: status === 'connecting',
            isDisconnected: status === 'disconnected',
            provider: undefined,
        };
    }, [address, status, provider]);
};
