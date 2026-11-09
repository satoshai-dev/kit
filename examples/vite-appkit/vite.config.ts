import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            input: {
                main: resolve(import.meta.dirname, 'index.html'),
                projectId: resolve(import.meta.dirname, 'project-id.html'),
                wagmi: resolve(import.meta.dirname, 'wagmi.html'),
            },
        },
    },
});
