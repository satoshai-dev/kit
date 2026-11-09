import { defineConfig } from '@playwright/test';

// Runs against the real WalletConnect relay: needs network access and
// VITE_WALLETCONNECT_PROJECT_ID in .env.local. Not part of CI.
export default defineConfig({
    testDir: './e2e',
    timeout: 120_000,
    expect: { timeout: 45_000 },
    fullyParallel: false,
    workers: 1,
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:5180',
        trace: 'retain-on-failure',
    },
    webServer: {
        command: 'pnpm dev',
        url: 'http://localhost:5180',
        reuseExistingServer: true,
    },
});
