import type { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
    title: '@satoshai/kit — Next.js Example',
    description: 'Stacks wallet integration with Next.js App Router',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body style={{ fontFamily: 'system-ui', padding: '2rem' }}>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
