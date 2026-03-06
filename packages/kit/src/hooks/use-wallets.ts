'use client';

import { useMemo } from 'react';

import { useStacksWalletContext } from '../provider/stacks-wallet-provider';

/**
 * List all configured wallets with availability status.
 *
 * Each wallet includes its `id`, display `name`, `icon` (data URI), `webUrl`
 * (install link), and whether it's `available` (extension detected or
 * WalletConnect configured).
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

    return useMemo(() => ({ wallets }), [wallets]);
};
