import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';

import { App } from './app';
import { appKit, wagmiAdapter } from './appkit-wagmi';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <WagmiProvider config={wagmiAdapter.wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <App appKit={appKit} />
            </QueryClientProvider>
        </WagmiProvider>
    </StrictMode>
);
