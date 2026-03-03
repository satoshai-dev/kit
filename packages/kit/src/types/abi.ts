import type {
    ClarityAbi,
    ClarityAbiArgToPrimitiveTypeValue,
    ExtractAbiFunction,
    ExtractAbiFunctionNames,
    Pretty,
} from 'clarity-abitype';

/** Contract principal string in the format `address.contract-name` */
export type TraitReference = `${string}.${string}`;

/** Union of public function names from a Clarity ABI */
export type PublicFunctionName<TAbi extends ClarityAbi> =
    ExtractAbiFunctionNames<TAbi, 'public'>;

/** Named args object for a specific public function, derived from ABI */
export type PublicFunctionArgs<
    TAbi extends ClarityAbi,
    TFn extends ExtractAbiFunctionNames<TAbi, 'public'>,
> = Pretty<{
    [K in ExtractAbiFunction<
        TAbi,
        TFn,
        'public'
    >['args'][number] as K['name']]: ClarityAbiArgToPrimitiveTypeValue<K>;
}>;
