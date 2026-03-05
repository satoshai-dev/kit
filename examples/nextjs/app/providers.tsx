'use client';

import { StacksWalletProvider } from '@satoshai/kit';

export function Providers({ children }: { children: React.ReactNode }) {
    return <StacksWalletProvider>{children}</StacksWalletProvider>;
}
