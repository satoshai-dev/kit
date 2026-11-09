import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Core } from '@walletconnect/core';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
import { WalletKit, type WalletKitTypes } from '@reown/walletkit';
import {
    Cl,
    getAddressFromPrivateKey,
    makeContractCall,
    makeSTXTokenTransfer,
    privateKeyToPublic,
    randomPrivateKey,
    signMessageHashRsv,
} from '@stacks/transactions';
import { hashMessage } from '@stacks/encryption';
import { bytesToHex } from '@stacks/common';

export const STACKS_MAINNET = 'stacks:1';
const BITCOIN_MAINNET = 'bip122:000000000019d6689c085ae165831e93';
// A valid mainnet P2WPKH address; the wallet never signs Bitcoin requests.
const BTC_ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

const STACKS_METHODS = [
    'stx_getAddresses',
    'stx_signMessage',
    'stx_signStructuredMessage',
    'stx_signTransaction',
    'stx_transferStx',
    'stx_callContract',
];
const STACKS_EVENTS = ['stx_accountChange', 'stx_accountsChanged', 'stx_chainChanged'];

export interface TestAccount {
    privateKey: string;
    publicKey: string;
    address: string;
}

export const createAccount = (): TestAccount => {
    const privateKey = randomPrivateKey();
    return {
        privateKey,
        publicKey: privateKeyToPublic(privateKey) as string,
        address: getAddressFromPrivateKey(privateKey, 'mainnet'),
    };
};

export interface RecordedRequest {
    method: string;
    params: Record<string, unknown>;
    chainId: string;
    result?: Record<string, unknown>;
}

/**
 * A headless WalletConnect wallet for e2e tests. It pairs over the real
 * relay, approves the Stacks namespace (and Bitcoin when `approveBitcoin`),
 * and signs Stacks requests with a random key. It never broadcasts.
 */
export class TestWallet {
    account = createAccount();
    requests: RecordedRequest[] = [];
    private kit!: InstanceType<typeof WalletKit>;
    private topic?: string;

    constructor(
        private readonly projectId: string,
        private readonly options: { approveBitcoin?: boolean; approveStacks?: boolean } = {}
    ) {}

    async start() {
        const core = new Core({
            projectId: this.projectId,
            customStoragePrefix: `e2e-${Date.now()}`,
            storageOptions: { database: join(mkdtempSync(join(tmpdir(), 'wc-e2e-')), 'db') },
        });
        this.kit = await WalletKit.init({
            core,
            metadata: {
                name: 'kit e2e wallet',
                description: 'Headless test wallet',
                url: 'https://example.com',
                icons: [],
            },
        });
        this.kit.on('session_proposal', (p) => void this.onProposal(p));
        this.kit.on('session_request', (r) => void this.onRequest(r));
        this.kit.on('session_delete', () => {
            this.topic = undefined;
        });
    }

    get sessionTopic() {
        return this.topic;
    }

    async pair(uri: string) {
        await this.kit.pair({ uri });
    }

    private async onProposal(proposal: WalletKitTypes.SessionProposal) {
        const supportedNamespaces: Record<string, { chains: string[]; methods: string[]; events: string[]; accounts: string[] }> = {};
        if (this.options.approveStacks !== false) {
            supportedNamespaces.stacks = {
                chains: [STACKS_MAINNET],
                methods: STACKS_METHODS,
                events: STACKS_EVENTS,
                accounts: [`${STACKS_MAINNET}:${this.account.address}`],
            };
        }
        if (this.options.approveBitcoin) {
            supportedNamespaces.bip122 = {
                chains: [BITCOIN_MAINNET],
                methods: ['getAccountAddresses', 'signMessage', 'signPsbt', 'sendTransfer'],
                events: ['bip122_addressesChanged'],
                accounts: [`${BITCOIN_MAINNET}:${BTC_ADDRESS}`],
            };
        }
        const namespaces = buildApprovedNamespaces({
            proposal: proposal.params,
            supportedNamespaces,
        });
        const session = await this.kit.approveSession({
            id: proposal.id,
            namespaces,
            sessionProperties: {
                stacks_getAddresses: JSON.stringify([
                    { address: this.account.address, publicKey: this.account.publicKey },
                ]),
            },
        });
        this.topic = session.topic;
    }

    private async onRequest(event: WalletKitTypes.SessionRequest) {
        const { topic, id } = event;
        const { method, params } = event.params.request as { method: string; params: Record<string, unknown> };
        const record: RecordedRequest = { method, params, chainId: event.params.chainId };
        this.requests.push(record);
        try {
            const result = await this.sign(method, params);
            record.result = result;
            await this.kit.respondSessionRequest({
                topic,
                response: { id, jsonrpc: '2.0', result },
            });
        } catch (error) {
            await this.kit.respondSessionRequest({
                topic,
                response: {
                    id,
                    jsonrpc: '2.0',
                    error: { code: 4001, message: error instanceof Error ? error.message : String(error) },
                },
            });
        }
    }

    private async sign(method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
        const { privateKey, publicKey } = this.account;
        switch (method) {
            case 'stx_signMessage': {
                const message = String(params.message);
                const signature = signMessageHashRsv({
                    messageHash: bytesToHex(hashMessage(message)),
                    privateKey,
                });
                return { signature, publicKey };
            }
            case 'stx_transferStx': {
                const tx = await makeSTXTokenTransfer({
                    recipient: String(params.recipient),
                    amount: BigInt(String(params.amount)),
                    memo: params.memo ? String(params.memo) : undefined,
                    senderKey: privateKey,
                    network: 'mainnet',
                    nonce: 0n,
                    fee: 1000n,
                });
                return { txid: tx.txid(), transaction: tx.serialize() };
            }
            case 'stx_callContract': {
                const [contractAddress, contractName] = String(params.contract).split('.');
                const tx = await makeContractCall({
                    contractAddress,
                    contractName,
                    functionName: String(params.functionName),
                    functionArgs: ((params.functionArgs as string[]) ?? []).map((a) => Cl.deserialize(a)),
                    postConditionMode: params.postConditionMode === 'allow' ? 'allow' : 'deny',
                    senderKey: privateKey,
                    network: 'mainnet',
                    nonce: 0n,
                    fee: 1000n,
                });
                return { txid: tx.txid(), transaction: tx.serialize() };
            }
            case 'getAccountAddresses':
                // Strict like Xverse: the bip122 spec requires `account`.
                if (!params || typeof params.account !== 'string') {
                    throw new Error('Invalid params: getAccountAddresses needs { account }');
                }
                // Bitcoin side of the shared session. Result shape from the
                // WalletConnect bip122 spec: an array of address objects.
                return [
                    { address: BTC_ADDRESS, path: "m/84'/0'/0'/0/0", intention: 'payment' },
                ] as unknown as Record<string, unknown>;
            default:
                throw new Error(`Test wallet does not handle ${method}`);
        }
    }

    /** Switch to a new account and tell the dApp through a session event. */
    async changeAccount() {
        if (!this.topic) throw new Error('No session');
        this.account = createAccount();
        await this.kit.emitSessionEvent({
            topic: this.topic,
            event: {
                name: 'stx_accountChange',
                data: [{ address: this.account.address, publicKey: this.account.publicKey }],
            },
            chainId: STACKS_MAINNET,
        });
        return this.account;
    }

    async disconnect() {
        if (!this.topic) return;
        await this.kit.disconnectSession({ topic: this.topic, reason: getSdkError('USER_DISCONNECTED') });
        this.topic = undefined;
    }

    activeSessionTopics() {
        return Object.keys(this.kit.getActiveSessions());
    }
}
