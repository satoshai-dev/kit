import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { TestWallet } from './test-wallet';

const projectId = readFileSync(resolve(import.meta.dirname, '../.env.local'), 'utf8')
    .match(/^VITE_WALLETCONNECT_PROJECT_ID=(.+)$/m)![1]
    .trim();

const status = (page: Page) => page.getByTestId('stx-status');

/** Wait until the example's AppKit finished its setup. */
const appKitReady = (page: Page) =>
    page.waitForFunction(() => (window as unknown as { __appKitReady?: boolean }).__appKitReady === true);

const pair = async (page: Page, wallet: TestWallet) => {
    const uri = await page.waitForFunction(() => (window as unknown as { __wcUri?: string }).__wcUri, null, {
        timeout: 30_000,
    });
    await wallet.pair(String(await uri.jsonValue()));
};

const modalOpen = (page: Page) =>
    page.evaluate(() => document.querySelector('w3m-modal')?.hasAttribute('open') ?? false);

// The app's AppKit has a wagmi (EVM) adapter as its active namespace, and
// the wallet approves no EVM account.
for (const approveBitcoin of [false, true]) {
    test(`wagmi app: a Stacks${approveBitcoin ? ' + Bitcoin' : '-only'} wallet connects cleanly`, async ({ browser }) => {
        const wallet = new TestWallet(projectId, { approveBitcoin });
        await wallet.start();
        const page = await browser.newPage();
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(`${e.message}\n${e.stack ?? ''}`.slice(0, 600)));
        await page.goto('/wagmi.html');
        await page.getByTestId('stx-connect-wc').click();
        await pair(page, wallet);
        await expect(status(page)).toHaveText(`connected wallet-connect ${wallet.account.address}`);
        await expect.poll(() => modalOpen(page)).toBe(false);

        await page.getByTestId('sign-message').click();
        await expect(page.getByTestId('sign-message-result')).toContainText('ok ');

        await page.waitForTimeout(3_000);
        expect(errors).toEqual([]);
        await page.getByTestId('stx-disconnect').click();
        await expect(status(page)).toHaveText('disconnected');
    });
}

// Control: AppKit's own Bitcoin flow on the same wagmi page, without the kit.
test('wagmi app control: AppKit Bitcoin-only connect, no kit involved', async ({ browser }) => {
    const wallet = new TestWallet(projectId, { approveBitcoin: true, approveStacks: false });
    await wallet.start();
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/wagmi.html');
    await appKitReady(page);
    await page.getByTestId('btc-connect').click();
    await page.locator('w3m-modal').getByText('WalletConnect', { exact: true }).first().click();
    await pair(page, wallet);
    await expect(page.getByTestId('btc-status')).toContainText('connected bc1q');
    await page.waitForTimeout(3_000);
    expect(errors).toEqual([]);
    await wallet.disconnect();
});
