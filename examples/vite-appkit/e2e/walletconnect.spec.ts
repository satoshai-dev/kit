import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifyMessageSignatureRsv } from '@stacks/encryption';

import { TestWallet } from './test-wallet';

const projectId = (() => {
    const env = readFileSync(resolve(import.meta.dirname, '../.env.local'), 'utf8');
    const match = env.match(/^VITE_WALLETCONNECT_PROJECT_ID=(.+)$/m);
    if (!match) throw new Error('VITE_WALLETCONNECT_PROJECT_ID missing in .env.local');
    return match[1].trim();
})();

const status = (page: Page) => page.getByTestId('stx-status');

/** Wait until the example's AppKit finished its setup. */
const appKitReady = (page: Page) =>
    page.waitForFunction(() => (window as unknown as { __appKitReady?: boolean }).__appKitReady === true);

/** Collect console text and AppKit SDK versions loaded by the page. */
const watchPage = (page: Page) => {
    const consoleLines: string[] = [];
    const sdkVersions = new Set<string>();
    page.on('console', (m) => consoleLines.push(m.text()));
    page.on('request', (r) => {
        const sv = new URL(r.url()).searchParams.get('sv');
        if (sv) sdkVersions.add(sv);
    });
    return { consoleLines, sdkVersions };
};

/** Read the pairing URI that the example app exposes, then pair the wallet. */
const pairWallet = async (page: Page, wallet: TestWallet) => {
    const uri = await page.waitForFunction(() => (window as unknown as { __wcUri?: string }).__wcUri, null, {
        timeout: 30_000,
    });
    await wallet.pair(String(await uri.jsonValue()));
};

const resetUri = (page: Page) =>
    page.evaluate(() => {
        delete (window as unknown as { __wcUri?: string }).__wcUri;
    });

test.describe.serial('Stacks WalletConnect through a shared AppKit', () => {
    let page: Page;
    let wallet: TestWallet;
    let watched: ReturnType<typeof watchPage>;

    test.beforeAll(async ({ browser }) => {
        wallet = new TestWallet(projectId, { approveBitcoin: true });
        await wallet.start();
        page = await browser.newPage();
        watched = watchPage(page);
        await page.goto('/');
        await expect(status(page)).toHaveText('disconnected');
    });

    test('closing the modal rejects the connect', async () => {
        await page.getByTestId('stx-connect-wc').click();
        await page.waitForFunction(() => (window as unknown as { __wcUri?: string }).__wcUri);
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('stx-connect-error')).toContainText('closed');
        await expect(status(page)).toHaveText('disconnected');
        await resetUri(page);
    });

    test('connects with a QR pairing and one AppKit', async () => {
        await page.getByTestId('stx-connect-wc').click();
        await pairWallet(page, wallet);
        await expect(status(page)).toHaveText(`connected wallet-connect ${wallet.account.address}`);

        // The same session also carries Bitcoin, so AppKit shows it connected.
        await expect(page.getByTestId('btc-status')).toContainText('connected bc1q');

        // Only the app's AppKit ran: no second init, no @stacks/connect AppKit.
        expect(watched.consoleLines.join('\n')).not.toContain('Init() was called 2 times');
        expect([...watched.sdkVersions].filter((v) => v.includes('1.7.'))).toEqual([]);
    });

    test('signs a message', async () => {
        await page.getByTestId('sign-message').click();
        await expect(page.getByTestId('sign-message-result')).toContainText('ok ');
        const req = wallet.requests.find((r) => r.method === 'stx_signMessage')!;
        expect(req.chainId).toBe('stacks:1');
        expect(req.params.address).toBe(wallet.account.address);
        const shown = JSON.parse((await page.getByTestId('sign-message-result').innerText()).slice(3));
        expect(shown.signature).toBe(req.result?.signature);
        expect(
            verifyMessageSignatureRsv({
                message: String(req.params.message),
                publicKey: wallet.account.publicKey,
                signature: shown.signature,
            })
        ).toBe(true);
    });

    test('transfers STX', async () => {
        await page.getByTestId('transfer-stx').click();
        await expect.poll(() => wallet.requests.some((r) => r.method === 'stx_transferStx')).toBe(true);
        const req = wallet.requests.find((r) => r.method === 'stx_transferStx')!;
        await expect(page.getByTestId('transfer-stx-result')).toHaveText(`ok ${req.result?.txid}`);
        expect(req.params.recipient).toBe('SP000000000000000000002Q6VF78');
        expect(req.params.amount).toBe('1');
    });

    test('calls a contract', async () => {
        await page.getByTestId('call-contract').click();
        await expect.poll(() => wallet.requests.some((r) => r.method === 'stx_callContract')).toBe(true);
        const req = wallet.requests.find((r) => r.method === 'stx_callContract')!;
        await expect(page.getByTestId('call-contract-result')).toHaveText(`ok ${req.result?.txid}`);
        expect(req.params.contract).toBe('SP000000000000000000002Q6VF78.pox-4');
        expect(req.params.functionName).toBe('allow-contract-caller');
    });

    test('follows a wallet account change', async () => {
        const next = await wallet.changeAccount();
        await expect(status(page)).toHaveText(`connected wallet-connect ${next.address}`);
    });

    test('restores the session after a reload', async () => {
        await page.reload();
        await expect(status(page)).toHaveText(/^connected wallet-connect SP/);
        const before = wallet.requests.length;
        await page.getByTestId('sign-message').click();
        await expect(page.getByTestId('sign-message-result')).toContainText('ok ');
        expect(wallet.requests.length).toBe(before + 1);
    });

    test('a wallet disconnect clears the dApp state', async () => {
        await wallet.disconnect();
        await expect(status(page)).toHaveText('disconnected');
        await expect(page.getByTestId('btc-status')).toHaveText('disconnected');
    });

    test('connects through the @stacks/connect modal', async () => {
        await resetUri(page);
        await page.getByTestId('stx-connect-modal').click();
        await page
            .locator('connect-modal li', { hasText: 'WalletConnect' })
            .getByRole('button', { name: 'Connect' })
            .click();
        await pairWallet(page, wallet);
        await expect(status(page)).toHaveText(`connected wallet-connect ${wallet.account.address}`);
    });

    test('a dApp disconnect ends the wallet session', async () => {
        const topic = wallet.sessionTopic!;
        await page.getByTestId('stx-disconnect').click();
        await expect(status(page)).toHaveText('disconnected');
        await expect.poll(() => wallet.activeSessionTopics().includes(topic)).toBe(false);
    });
});

test('a wallet that approves only Bitcoin gets a clear error', async ({ browser }) => {
    const wallet = new TestWallet(projectId, { approveBitcoin: true, approveStacks: false });
    await wallet.start();
    const page = await browser.newPage();
    await page.goto('/');
    await page.getByTestId('stx-connect-wc').click();
    await pairWallet(page, wallet);
    await expect(page.getByTestId('stx-connect-error')).toContainText('did not approve Stacks');
    await expect(status(page)).toHaveText('disconnected');
    // The failed Stacks connect must not end the Bitcoin session.
    const topic = wallet.sessionTopic!;
    await page.waitForTimeout(3_000);
    expect(wallet.activeSessionTopics()).toContain(topic);
    await expect(page.getByTestId('btc-status')).toContainText('connected bc1q');
    await wallet.disconnect();
});

test('a wallet that approves only Stacks connects and the modal closes', async ({ browser }) => {
    const wallet = new TestWallet(projectId);
    await wallet.start();
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.getByTestId('stx-connect-wc').click();
    await pairWallet(page, wallet);
    await expect(status(page)).toHaveText(`connected wallet-connect ${wallet.account.address}`);
    await expect(page.getByTestId('btc-status')).toHaveText('disconnected');
    await expect.poll(() => page.evaluate(() => document.querySelector('w3m-modal')?.hasAttribute('open') ?? false)).toBe(false);
    await page.waitForTimeout(3_000);
    expect(errors).toEqual([]);
    await wallet.disconnect();
});

test('a Stacks connect replaces an older session without Stacks', async ({ browser }) => {
    // An older Bitcoin-only WalletConnect session, made through AppKit itself.
    const btcWallet = new TestWallet(projectId, { approveBitcoin: true, approveStacks: false });
    await btcWallet.start();
    const page = await browser.newPage();
    await page.goto('/');
    await appKitReady(page);
    await page.getByTestId('btc-connect').click();
    await page.locator('w3m-modal').getByText('WalletConnect', { exact: true }).first().click();
    await pairWallet(page, btcWallet);
    await expect(page.getByTestId('btc-status')).toContainText('connected bc1q');
    const oldTopic = btcWallet.sessionTopic!;
    await page.keyboard.press('Escape');

    // The Stacks connect ends that session and pairs again.
    await resetUri(page);
    const wallet = new TestWallet(projectId, { approveBitcoin: true });
    await wallet.start();
    await page.getByTestId('stx-connect-wc').click();
    await pairWallet(page, wallet);
    await expect(status(page)).toHaveText(`connected wallet-connect ${wallet.account.address}`);
    await expect.poll(() => btcWallet.activeSessionTopics().includes(oldTopic)).toBe(false);
    await wallet.disconnect();
});
