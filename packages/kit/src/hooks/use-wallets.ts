'use client';

import { useMemo } from 'react';

import { useStacksWalletContext } from '../provider/stacks-wallet-provider';

export const useWallets = () => {
    const { wallets } = useStacksWalletContext();

    return useMemo(() => ({ wallets }), [wallets]);
};
