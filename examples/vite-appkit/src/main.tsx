import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';
import { appKit } from './appkit';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App appKit={appKit} />
    </StrictMode>
);
