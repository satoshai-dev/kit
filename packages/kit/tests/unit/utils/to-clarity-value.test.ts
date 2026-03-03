import { describe, it, expect } from 'vitest';
import {
    uintCV,
    intCV,
    trueCV,
    falseCV,
    noneCV,
    someCV,
    bufferCV,
    stringAsciiCV,
    stringUtf8CV,
    listCV,
    tupleCV,
    standardPrincipalCV,
    contractPrincipalCV,
} from '@stacks/transactions';

import {
    toClarityValue,
    namedArgsToClarityValues,
} from '../../../src/utils/to-clarity-value';

describe('toClarityValue', () => {
    it('converts uint128', () => {
        expect(toClarityValue(100n, 'uint128')).toEqual(uintCV(100n));
    });

    it('converts int128', () => {
        expect(toClarityValue(-50n, 'int128')).toEqual(intCV(-50n));
    });

    it('converts bool true', () => {
        expect(toClarityValue(true, 'bool')).toEqual(trueCV());
    });

    it('converts bool false', () => {
        expect(toClarityValue(false, 'bool')).toEqual(falseCV());
    });

    it('converts standard principal', () => {
        const addr = 'SP000000000000000000002Q6VF78';
        expect(toClarityValue(addr, 'principal')).toEqual(
            standardPrincipalCV(addr)
        );
    });

    it('converts contract principal', () => {
        const addr = 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.my-token';
        expect(toClarityValue(addr, 'principal')).toEqual(
            contractPrincipalCV(
                'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
                'my-token'
            )
        );
    });

    it('converts trait_reference as contract principal', () => {
        const addr = 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.sip-010-trait';
        expect(toClarityValue(addr, 'trait_reference')).toEqual(
            contractPrincipalCV(
                'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
                'sip-010-trait'
            )
        );
    });

    it('converts none', () => {
        expect(toClarityValue(null, 'none')).toEqual(noneCV());
    });

    it('converts buffer', () => {
        const buf = new Uint8Array([1, 2, 3]);
        expect(toClarityValue(buf, { buffer: { length: 3 } })).toEqual(
            bufferCV(buf)
        );
    });

    it('converts string-ascii', () => {
        expect(
            toClarityValue('hello', { 'string-ascii': { length: 32 } })
        ).toEqual(stringAsciiCV('hello'));
    });

    it('converts string-utf8', () => {
        expect(
            toClarityValue('hello', { 'string-utf8': { length: 32 } })
        ).toEqual(stringUtf8CV('hello'));
    });

    it('converts optional with value', () => {
        expect(
            toClarityValue(100n, { optional: 'uint128' })
        ).toEqual(someCV(uintCV(100n)));
    });

    it('converts optional null to noneCV', () => {
        expect(
            toClarityValue(null, { optional: 'uint128' })
        ).toEqual(noneCV());
    });

    it('converts list', () => {
        expect(
            toClarityValue([1n, 2n, 3n], {
                list: { type: 'uint128', length: 3 },
            })
        ).toEqual(listCV([uintCV(1n), uintCV(2n), uintCV(3n)]));
    });

    it('converts tuple', () => {
        expect(
            toClarityValue(
                { amount: 100n, sender: 'SP000000000000000000002Q6VF78' },
                {
                    tuple: [
                        { name: 'amount', type: 'uint128' },
                        { name: 'sender', type: 'principal' },
                    ],
                }
            )
        ).toEqual(
            tupleCV({
                amount: uintCV(100n),
                sender: standardPrincipalCV(
                    'SP000000000000000000002Q6VF78'
                ),
            })
        );
    });

    // Error cases
    it('throws on wrong type for uint128', () => {
        expect(() => toClarityValue(100, 'uint128')).toThrow(
            '@satoshai/kit: Expected bigint (uint128), got number'
        );
    });

    it('throws on wrong type for int128', () => {
        expect(() => toClarityValue('foo', 'int128')).toThrow(
            '@satoshai/kit: Expected bigint (int128), got string'
        );
    });

    it('throws on wrong type for bool', () => {
        expect(() => toClarityValue(1, 'bool')).toThrow(
            '@satoshai/kit: Expected boolean (bool), got number'
        );
    });

    it('throws on wrong type for principal', () => {
        expect(() => toClarityValue(123, 'principal')).toThrow(
            '@satoshai/kit: Expected string (principal), got number'
        );
    });

    it('throws on wrong type for buffer', () => {
        expect(() =>
            toClarityValue('not-bytes', { buffer: { length: 10 } })
        ).toThrow(
            '@satoshai/kit: Expected Uint8Array (buffer), got string'
        );
    });

    it('throws on unsupported string type', () => {
        expect(() => toClarityValue(null, 'unknown_type')).toThrow(
            '@satoshai/kit: Unsupported ABI type "unknown_type"'
        );
    });
});

describe('namedArgsToClarityValues', () => {
    const abiArgs = [
        { name: 'amount', type: 'uint128' as const },
        { name: 'sender', type: 'principal' as const },
    ];

    it('converts named args in ABI order', () => {
        const result = namedArgsToClarityValues(
            {
                sender: 'SP000000000000000000002Q6VF78',
                amount: 100n,
            },
            abiArgs
        );

        expect(result).toEqual([
            uintCV(100n),
            standardPrincipalCV('SP000000000000000000002Q6VF78'),
        ]);
    });

    it('returns empty array for no args', () => {
        expect(namedArgsToClarityValues({}, [])).toEqual([]);
    });

    it('throws on missing argument', () => {
        expect(() =>
            namedArgsToClarityValues({ amount: 100n }, abiArgs)
        ).toThrow('@satoshai/kit: Missing argument "sender"');
    });
});
