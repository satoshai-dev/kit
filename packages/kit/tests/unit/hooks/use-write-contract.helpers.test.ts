import { describe, it, expect } from 'vitest';
import { uintCV, stringAsciiCV } from '@stacks/transactions';
import type { StxPostCondition } from '@stacks/transactions';

import {
    prepareArgsForOKX,
    preparePostConditionsForOKX,
} from '../../../src/hooks/use-write-contract/use-write-contract.helpers';

describe('prepareArgsForOKX', () => {
    it('converts ClarityValues to hex strings', () => {
        const args = [uintCV(100), stringAsciiCV('hello')];
        const result = prepareArgsForOKX(args);

        expect(result).toHaveLength(2);
        result.forEach((hex) => {
            expect(typeof hex).toBe('string');
            expect(hex.startsWith('0x')).toBe(true);
        });
    });

    it('returns empty array for empty args', () => {
        expect(prepareArgsForOKX([])).toEqual([]);
    });
});

describe('preparePostConditionsForOKX', () => {
    it('converts PostConditions to hex strings', () => {
        const stxPostCondition: StxPostCondition = {
            type: 'stx-postcondition',
            address: 'SP000000000000000000002Q6VF78',
            condition: 'lte',
            amount: 1000000n,
        };

        const result = preparePostConditionsForOKX([stxPostCondition]);

        expect(result).toHaveLength(1);
        expect(typeof result[0]).toBe('string');
        expect(result[0].length).toBeGreaterThan(0);
    });

    it('passes pre-serialized hex post-conditions through unchanged', () => {
        // STX-lock (`staking`) post-condition, serialized by the caller.
        const lockHex =
            '030216e9c7cdade53597b951d60c90de954e553a0a2c4d0500000000000f4240';
        const stxPostCondition: StxPostCondition = {
            type: 'stx-postcondition',
            address: 'SP000000000000000000002Q6VF78',
            condition: 'lte',
            amount: 1000000n,
        };

        const result = preparePostConditionsForOKX([
            lockHex,
            stxPostCondition,
        ]);

        expect(result).toHaveLength(2);
        expect(result[0]).toBe(lockHex);
        expect(typeof result[1]).toBe('string');
    });

    it('returns empty array for empty post conditions', () => {
        expect(preparePostConditionsForOKX([])).toEqual([]);
    });
});
