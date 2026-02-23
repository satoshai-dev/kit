'use client';

import { getPrimaryName } from 'bns-v2-sdk';
import { useEffect, useState } from 'react';

import { getNetworkFromAddress } from '../utils/get-network-from-address';

export const useBnsName = (address?: string) => {
    const [bnsName, setBnsName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!address) {
            setBnsName(null);
            setIsLoading(false);
            return;
        }

        const fetchBnsName = async () => {
            setIsLoading(true);

            try {
                const network = getNetworkFromAddress(address);
                const result = await getPrimaryName({ address, network });

                const fullName = result
                    ? `${result.name}.${result.namespace}`
                    : null;

                setBnsName(fullName);
            } catch {
                setBnsName(null);
            } finally {
                setIsLoading(false);
            }
        };

        void fetchBnsName();
    }, [address]);

    return { bnsName, isLoading };
};
