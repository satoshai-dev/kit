import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { TestWallet } from './test-wallet';

const projectId = readFileSync(resolve(import.meta.dirname, '../.env.local'), 'utf8')
    .match(/^VITE_WALLETCONNECT_PROJECT_ID=(.+)$/m)![1]
    .trim();

// Without an app AppKit, the kit keeps the @stacks/connect WalletConnect path.
test('projectId mode still connects and signs through @stacks/connect', async ({ page }) => {
    const wallet = new TestWallet(projectId);
    await wallet.start();
    await page.goto('/project-id.html');
    await page.getByTestId('stx-connect-wc').click();

    // @stacks/connect's own AppKit renders the QR; read the URI from it.
    const qr = page.locator('wui-qr-code');
    await expect(qr).toBeAttached({ timeout: 30_000 });
    const uri = await qr.evaluate((el) => (el as unknown as { uri: string }).uri);
    expect(uri).toMatch(/^wc:/);
    await wallet.pair(uri);

    await expect(page.getByTestId('stx-status')).toHaveText(
        `connected wallet-connect ${wallet.account.address}`
    );
    await page.getByTestId('sign-message').click();
    await expect(page.getByTestId('sign-message-result')).toContainText('ok ');
    await wallet.disconnect();
});
