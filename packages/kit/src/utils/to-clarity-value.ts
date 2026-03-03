import type { ClarityValue } from '@stacks/transactions';
import {
    uintCV,
    intCV,
    boolCV,
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
type AbiType = string | Record<string, unknown>;

/** Loose ABI arg shape for runtime use — avoids importing ClarityAbiArg. */
interface AbiArgLike {
    name: string;
    type: unknown;
}

/** Convert a JS primitive to a ClarityValue guided by an ABI type descriptor. */
export function toClarityValue(value: unknown, abiType: AbiType): ClarityValue {
    if (typeof abiType === 'string') {
        switch (abiType) {
            case 'uint128': {
                if (typeof value !== 'bigint') {
                    throw new Error(
                        `@satoshai/kit: Expected bigint (uint128), got ${typeof value}`
                    );
                }
                return uintCV(value);
            }
            case 'int128': {
                if (typeof value !== 'bigint') {
                    throw new Error(
                        `@satoshai/kit: Expected bigint (int128), got ${typeof value}`
                    );
                }
                return intCV(value);
            }
            case 'bool': {
                if (typeof value !== 'boolean') {
                    throw new Error(
                        `@satoshai/kit: Expected boolean (bool), got ${typeof value}`
                    );
                }
                return boolCV(value);
            }
            case 'principal':
            case 'trait_reference': {
                if (typeof value !== 'string') {
                    throw new Error(
                        `@satoshai/kit: Expected string (${abiType}), got ${typeof value}`
                    );
                }
                if (value.includes('.')) {
                    const [addr, ...rest] = value.split('.');
                    return contractPrincipalCV(addr, rest.join('.'));
                }
                return standardPrincipalCV(value);
            }
            case 'none':
                return noneCV();
            default:
                throw new Error(
                    `@satoshai/kit: Unsupported ABI type "${abiType}"`
                );
        }
    }

    if ('buffer' in abiType) {
        if (!(value instanceof Uint8Array)) {
            throw new Error(
                `@satoshai/kit: Expected Uint8Array (buffer), got ${typeof value}`
            );
        }
        return bufferCV(value);
    }
    if ('string-ascii' in abiType) {
        if (typeof value !== 'string') {
            throw new Error(
                `@satoshai/kit: Expected string (string-ascii), got ${typeof value}`
            );
        }
        return stringAsciiCV(value);
    }
    if ('string-utf8' in abiType) {
        if (typeof value !== 'string') {
            throw new Error(
                `@satoshai/kit: Expected string (string-utf8), got ${typeof value}`
            );
        }
        return stringUtf8CV(value);
    }
    if ('optional' in abiType) {
        if (value === null || value === undefined) return noneCV();
        return someCV(toClarityValue(value, abiType.optional as AbiType));
    }
    if ('list' in abiType) {
        if (!Array.isArray(value)) {
            throw new Error(
                `@satoshai/kit: Expected array (list), got ${typeof value}`
            );
        }
        const listType = abiType.list as { type: AbiType };
        return listCV(
            value.map((item) => toClarityValue(item, listType.type))
        );
    }
    if ('tuple' in abiType) {
        if (typeof value !== 'object' || value === null) {
            throw new Error(
                `@satoshai/kit: Expected object (tuple), got ${value === null ? 'null' : typeof value}`
            );
        }
        const entries = abiType.tuple as Array<{
            name: string;
            type: AbiType;
        }>;
        const obj = value as Record<string, unknown>;
        const result: Record<string, ClarityValue> = {};
        for (const entry of entries) {
            result[entry.name] = toClarityValue(obj[entry.name], entry.type);
        }
        return tupleCV(result);
    }

    throw new Error(
        `@satoshai/kit: Unsupported ABI type: ${JSON.stringify(abiType)}`
    );
}

/** Convert a named args object to an ordered ClarityValue[] using ABI arg definitions. */
export function namedArgsToClarityValues(
    args: Record<string, unknown>,
    abiArgs: readonly AbiArgLike[]
): ClarityValue[] {
    return abiArgs.map((abiArg) => {
        if (!(abiArg.name in args)) {
            throw new Error(
                `@satoshai/kit: Missing argument "${abiArg.name}"`
            );
        }
        return toClarityValue(
            args[abiArg.name],
            abiArg.type as AbiType
        );
    });
}
