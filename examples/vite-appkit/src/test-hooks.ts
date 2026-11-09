type TestableAppKit = {
    ready?(): Promise<void>;
    getUniversalProvider(): Promise<{ on(event: string, handler: (uri: string) => void): unknown } | undefined>;
};

/**
 * Test hooks: expose the pairing URI so the e2e wallet can scan it, and flag
 * when AppKit finished its setup (a modal opened before that closes at once).
 */
export const exposePairingUri = (appKit: TestableAppKit) => {
    const win = window as unknown as { __wcUri?: string; __appKitReady?: boolean };
    void (appKit.ready?.() ?? Promise.resolve()).then(() => {
        win.__appKitReady = true;
    });
    void appKit.getUniversalProvider().then((provider) => {
        provider?.on('display_uri', (uri: string) => {
            win.__wcUri = uri;
        });
    });
};
