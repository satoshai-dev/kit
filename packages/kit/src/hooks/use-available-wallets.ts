'use client';

import { useMemo } from 'react';

import { useStacksWalletContext } from '../provider/stacks-wallet-provider';

export const useAvailableWallets = () => {
    const { availableWallets } = useStacksWalletContext();

    return useMemo(() => ({ availableWallets }), [availableWallets]);
};
