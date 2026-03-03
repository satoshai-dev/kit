import { describe, it, expect } from 'vitest';

import { createContractConfig } from '../../../src/utils/create-contract-config';

const testAbi = {
    functions: [
        {
            name: 'transfer',
            access: 'public',
            args: [
                { name: 'amount', type: 'uint128' },
                { name: 'sender', type: 'principal' },
            ],
            outputs: { type: { response: { ok: 'bool', error: 'uint128' } } },
        },
    ],
    variables: [],
    maps: [],
    fungible_tokens: [],
    non_fungible_tokens: [],
} as const;

describe('createContractConfig', () => {
    it('returns the config object unchanged', () => {
        const config = {
            abi: testAbi,
            address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
            contract: 'my-token',
        };

        const result = createContractConfig(config);

        expect(result).toEqual(config);
        expect(result.abi).toBe(config.abi);
        expect(result.address).toBe(config.address);
        expect(result.contract).toBe(config.contract);
    });
});
