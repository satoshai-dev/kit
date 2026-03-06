'use client';

import { getPrimaryName } from 'bns-v2-sdk';
import { useEffect, useState } from 'react';

import { getNetworkFromAddress } from '../utils/get-network-from-address';

/**
 * Resolve a BNS v2 primary name for a Stacks address.
 *
 * Returns `null` when no name is registered or the address is undefined.
 * Automatically detects mainnet/testnet from the address prefix.
 *
 * @param address - Stacks address to resolve (`SP...` or `ST...`).
 *
 * @example
 * ```ts
 * const { bnsName, isLoading } = useBnsName('SP2...');
 * // bnsName = 'satoshi.btc' | null
 * ```
 */
export const useBnsName = (address?: string) => {
    const [bnsName, setBnsName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!address) {
            setBnsName(null);
            setIsLoading(false);
            return;
        }

        let cancelled = false;

        const fetchBnsName = async () => {
            setIsLoading(true);

            try {
                const network = getNetworkFromAddress(address);
                const result = await getPrimaryName({ address, network });

                if (cancelled) return;

                const fullName = result
                    ? `${result.name}.${result.namespace}`
                    : null;

                setBnsName(fullName);
            } catch {
                if (cancelled) return;
                setBnsName(null);
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        void fetchBnsName();

        return () => {
            cancelled = true;
        };
    }, [address]);

    return { bnsName, isLoading };
};
