'use client';

import { useMemo } from 'react';

import { useStacksWalletContext } from '../provider/stacks-wallet-provider';
import { getStacksWallets } from '../utils/get-stacks-wallets';

/**
 * List all configured wallets with availability status.
 *
 * Each wallet includes its `id`, display `name`, `icon` (data URI), `webUrl`
 * (install link), and whether it's `available` (extension detected or
 * WalletConnect configured).
 *
 * Performs a fresh check of `window` globals on every render so that
 * browser extensions injected after React hydration are detected by the
 * time the consumer reads the wallet list (e.g. when a connect-wallet
 * drawer opens).
 *
 * @example
 * ```ts
 * const { wallets } = useWallets();
 *
 * wallets.map(({ id, name, icon, available }) => (
 *   <button key={id} onClick={() => connect(id)} disabled={!available}>
 *     <img src={icon} alt={name} width={20} /> {name}
 *   </button>
 * ));
 * ```
 */
export const useWallets = () => {
    const { wallets } = useStacksWalletContext();
    const { installed } = getStacksWallets();
    const installedKey = installed.join(',');

    return useMemo(
        () => ({
            wallets: wallets.map((w) => ({
                ...w,
                // wallet-connect availability is controlled by projectId in
                // the provider — don't override with getStacksWallets() which
                // unconditionally returns true for it.
                available:
                    w.id === 'wallet-connect'
                        ? w.available
                        : w.available || installed.includes(w.id),
            })),
        }),
        [wallets, installedKey]
    );
};
