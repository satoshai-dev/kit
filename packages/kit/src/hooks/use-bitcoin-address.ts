'use client';

import { useMemo } from 'react';

import { useStacksWalletContext } from '../provider/stacks-wallet-provider';

type UseBitcoinAddressReturn =
    | {
          paymentAddress: undefined;
          paymentPublicKey: undefined;
          isAvailable: false;
      }
    | {
          paymentAddress: string;
          paymentPublicKey: string | undefined;
          isAvailable: true;
      };

/**
 * Read the connected wallet's Bitcoin **payment** address (native segwit,
 * `p2wpkh`) — the send/receive BTC address, e.g. the destination for an sBTC
 * withdrawal (bridge-out).
 *
 * Returns a discriminated union: when `isAvailable` is `true`, `paymentAddress`
 * is guaranteed to be a string. `isAvailable` is `false` when no wallet is
 * connected **or** when the connected wallet doesn't expose a BTC payment
 * address (e.g. OKX, WalletConnect). The taproot/ordinals address is
 * intentionally not exposed — it holds inscriptions and must not receive BTC.
 *
 * @example
 * ```ts
 * const { paymentAddress, paymentPublicKey, isAvailable } = useBitcoinAddress();
 *
 * if (isAvailable) {
 *   console.log(paymentAddress);   // 'bc1q…' — narrowed to string
 *   console.log(paymentPublicKey); // pubkey for signing the withdrawal PSBT
 * }
 * ```
 */
export const useBitcoinAddress = (): UseBitcoinAddressReturn => {
    const { status, btcAddress, btcPublicKey } = useStacksWalletContext();

    return useMemo(() => {
        if (status === 'connected' && btcAddress) {
            return {
                paymentAddress: btcAddress,
                paymentPublicKey: btcPublicKey,
                isAvailable: true as const,
            };
        }

        return {
            paymentAddress: undefined,
            paymentPublicKey: undefined,
            isAvailable: false as const,
        };
    }, [status, btcAddress, btcPublicKey]);
};
