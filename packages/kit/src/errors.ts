/** Discriminated type for narrowing caught errors to `BaseError`. */
export type BaseErrorType = BaseError & { name: 'StacksKitError' }

/**
 * Base error class for all `@satoshai/kit` errors.
 *
 * All errors thrown by hooks extend this class, so you can catch them with
 * `error instanceof BaseError` and use {@link BaseError.walk | walk()} to
 * traverse the cause chain.
 *
 * @example
 * ```ts
 * import { BaseError } from '@satoshai/kit';
 *
 * try {
 *   await signMessageAsync({ message: 'hello' });
 * } catch (err) {
 *   if (err instanceof BaseError) {
 *     console.log(err.shortMessage); // human-readable summary
 *     console.log(err.walk());       // root cause
 *   }
 * }
 * ```
 */
export class BaseError extends Error {
    override name = 'StacksKitError'

    /** Short, human-readable error summary without details or cause chain. */
    shortMessage: string

    constructor(shortMessage: string, options?: { cause?: Error; details?: string }) {
        const message = [
            shortMessage,
            options?.details && `Details: ${options.details}`,
        ].filter(Boolean).join('\n\n')

        super(message, options?.cause ? { cause: options.cause } : undefined)
        this.shortMessage = shortMessage
    }

    /**
     * Walk the error cause chain. If `fn` is provided, returns the first error
     * where `fn` returns `true`; otherwise returns the root cause.
     */
    walk(fn?: (err: unknown) => boolean): unknown {
        return walk(this, fn)
    }
}

function walk(err: unknown, fn?: (err: unknown) => boolean): unknown {
    if (fn?.(err)) return err
    if (err && typeof err === 'object' && 'cause' in err) {
        return walk((err as { cause: unknown }).cause, fn)
    }
    return err
}

/** Discriminated type for narrowing to `WalletNotConnectedError`. */
export type WalletNotConnectedErrorType = WalletNotConnectedError & {
    name: 'WalletNotConnectedError'
}

/** Thrown when a mutation hook is called before a wallet is connected. */
export class WalletNotConnectedError extends BaseError {
    override name = 'WalletNotConnectedError'

    constructor() {
        super('Wallet is not connected')
    }
}

/** Discriminated type for narrowing to `WalletNotFoundError`. */
export type WalletNotFoundErrorType = WalletNotFoundError & {
    name: 'WalletNotFoundError'
}

/** Thrown when a wallet's browser extension is not installed (e.g. OKX). */
export class WalletNotFoundError extends BaseError {
    override name = 'WalletNotFoundError'

    /** The wallet ID that was not found. */
    wallet: string

    constructor({ wallet }: { wallet: string }) {
        super(`${wallet} wallet not found`, {
            details: 'The wallet extension may not be installed.',
        })
        this.wallet = wallet
    }
}

/** Discriminated type for narrowing to `UnsupportedMethodError`. */
export type UnsupportedMethodErrorType = UnsupportedMethodError & {
    name: 'UnsupportedMethodError'
}

/** Thrown when a wallet does not support the requested RPC method (e.g. OKX + `stx_signStructuredMessage`). */
export class UnsupportedMethodError extends BaseError {
    override name = 'UnsupportedMethodError'

    /** The SIP-030 method name that is not supported. */
    method: string
    /** The wallet that does not support the method. */
    wallet: string

    constructor({ method, wallet }: { method: string; wallet: string }) {
        super(`${method} is not supported by ${wallet} wallet`)
        this.method = method
        this.wallet = wallet
    }
}

/** Discriminated type for narrowing to `WalletRequestError`. */
export type WalletRequestErrorType = WalletRequestError & {
    name: 'WalletRequestError'
}

/** Thrown when a wallet RPC request fails (user rejection, timeout, etc.). The original error is attached as `cause`. */
export class WalletRequestError extends BaseError {
    override name = 'WalletRequestError'

    /** The SIP-030 method name that failed. */
    method: string
    /** The wallet that returned the error. */
    wallet: string

    constructor({ method, wallet, cause }: { method: string; wallet: string; cause: Error }) {
        super(`${wallet} wallet request failed`, {
            cause,
            details: cause.message,
        })
        this.method = method
        this.wallet = wallet
    }
}
