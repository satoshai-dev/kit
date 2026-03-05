export type BaseErrorType = BaseError & { name: 'StacksKitError' }

export class BaseError extends Error {
    override name = 'StacksKitError'

    shortMessage: string

    constructor(shortMessage: string, options?: { cause?: Error; details?: string }) {
        const message = [
            shortMessage,
            options?.details && `Details: ${options.details}`,
        ].filter(Boolean).join('\n\n')

        super(message, options?.cause ? { cause: options.cause } : undefined)
        this.shortMessage = shortMessage
    }

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

export type WalletNotConnectedErrorType = WalletNotConnectedError & {
    name: 'WalletNotConnectedError'
}

export class WalletNotConnectedError extends BaseError {
    override name = 'WalletNotConnectedError'

    constructor() {
        super('Wallet is not connected')
    }
}

export type WalletNotFoundErrorType = WalletNotFoundError & {
    name: 'WalletNotFoundError'
}

export class WalletNotFoundError extends BaseError {
    override name = 'WalletNotFoundError'

    wallet: string

    constructor({ wallet }: { wallet: string }) {
        super(`${wallet} wallet not found`, {
            details: 'The wallet extension may not be installed.',
        })
        this.wallet = wallet
    }
}

export type UnsupportedMethodErrorType = UnsupportedMethodError & {
    name: 'UnsupportedMethodError'
}

export class UnsupportedMethodError extends BaseError {
    override name = 'UnsupportedMethodError'

    method: string
    wallet: string

    constructor({ method, wallet }: { method: string; wallet: string }) {
        super(`${method} is not supported by ${wallet} wallet`)
        this.method = method
        this.wallet = wallet
    }
}

export type WalletRequestErrorType = WalletRequestError & {
    name: 'WalletRequestError'
}

export class WalletRequestError extends BaseError {
    override name = 'WalletRequestError'

    method: string
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
