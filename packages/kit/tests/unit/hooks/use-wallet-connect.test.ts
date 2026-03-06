// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClearSelectedProviderId = vi.fn();
vi.mock('@stacks/connect', () => ({
    clearSelectedProviderId: mockClearSelectedProviderId,
}));

const mockGetWcUniversalProvider = vi.fn();
const mockExtractStacksAddressFromCaip10 = vi.fn();
const mockPingSession = vi.fn();

vi.mock(
    '../../../src/hooks/use-wallet-connect/use-wallet-connect.helpers',
    () => ({
        getWcUniversalProvider: mockGetWcUniversalProvider,
        extractStacksAddressFromCaip10: mockExtractStacksAddressFromCaip10,
        pingSession: mockPingSession,
    })
);

const { useWalletConnect } = await import(
    '../../../src/hooks/use-wallet-connect/use-wallet-connect'
);

const flushPromises = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
    mockClearSelectedProviderId.mockReset();
    mockGetWcUniversalProvider.mockReset();
    mockExtractStacksAddressFromCaip10.mockReset();
    mockPingSession.mockReset();
});

describe('useWalletConnect', () => {
    describe('non-wallet-connect provider', () => {
        it('does not run effects when provider is not wallet-connect', async () => {
            await act(async () => {
                renderHook(() =>
                    useWalletConnect({
                        address: 'SP123',
                        provider: 'leather',
                        onAddressChange: vi.fn(),
                        onDisconnect: vi.fn(),
                    })
                );
                await flushPromises();
            });

            expect(mockPingSession).not.toHaveBeenCalled();
            expect(mockGetWcUniversalProvider).not.toHaveBeenCalled();
        });

        it('does not run effects when provider is undefined', async () => {
            await act(async () => {
                renderHook(() =>
                    useWalletConnect({
                        address: undefined,
                        provider: undefined,
                        onAddressChange: vi.fn(),
                        onDisconnect: vi.fn(),
                    })
                );
                await flushPromises();
            });

            expect(mockPingSession).not.toHaveBeenCalled();
        });
    });

    describe('session validation', () => {
        it('calls onDisconnect when ping fails (zombie session)', async () => {
            mockPingSession.mockResolvedValue(false);
            mockGetWcUniversalProvider.mockReturnValue({
                disconnect: vi.fn().mockResolvedValue(undefined),
                on: vi.fn(),
                off: vi.fn(),
            });

            const onDisconnect = vi.fn();

            await act(async () => {
                renderHook(() =>
                    useWalletConnect({
                        address: 'SP123',
                        provider: 'wallet-connect',
                        onAddressChange: vi.fn(),
                        onDisconnect,
                    })
                );
                await flushPromises();
            });

            expect(mockPingSession).toHaveBeenCalled();
            expect(mockClearSelectedProviderId).toHaveBeenCalled();
            expect(onDisconnect).toHaveBeenCalled();
        });

        it('does not disconnect when ping succeeds', async () => {
            mockPingSession.mockResolvedValue(true);
            mockGetWcUniversalProvider.mockReturnValue({
                on: vi.fn(),
                off: vi.fn(),
            });

            const onDisconnect = vi.fn();

            await act(async () => {
                renderHook(() =>
                    useWalletConnect({
                        address: 'SP123',
                        provider: 'wallet-connect',
                        onAddressChange: vi.fn(),
                        onDisconnect,
                    })
                );
                await flushPromises();
            });

            expect(onDisconnect).not.toHaveBeenCalled();
        });
    });

    describe('event listeners', () => {
        it('subscribes to disconnect and accountsChanged events', async () => {
            mockPingSession.mockResolvedValue(true);
            const mockOn = vi.fn();
            mockGetWcUniversalProvider.mockReturnValue({
                on: mockOn,
                off: vi.fn(),
            });

            await act(async () => {
                renderHook(() =>
                    useWalletConnect({
                        address: 'SP123',
                        provider: 'wallet-connect',
                        onAddressChange: vi.fn(),
                        onDisconnect: vi.fn(),
                    })
                );
                await flushPromises();
            });

            expect(mockOn).toHaveBeenCalledWith(
                'disconnect',
                expect.any(Function)
            );
            expect(mockOn).toHaveBeenCalledWith(
                'accountsChanged',
                expect.any(Function)
            );
        });

        it('calls onDisconnect when disconnect event fires', async () => {
            mockPingSession.mockResolvedValue(true);
            const listeners: Record<string, Function> = {};
            mockGetWcUniversalProvider.mockReturnValue({
                on: (event: string, handler: Function) => {
                    listeners[event] = handler;
                },
                off: vi.fn(),
            });

            const onDisconnect = vi.fn();

            await act(async () => {
                renderHook(() =>
                    useWalletConnect({
                        address: 'SP123',
                        provider: 'wallet-connect',
                        onAddressChange: vi.fn(),
                        onDisconnect,
                    })
                );
                await flushPromises();
            });

            act(() => {
                listeners['disconnect']!();
            });

            expect(mockClearSelectedProviderId).toHaveBeenCalled();
            expect(onDisconnect).toHaveBeenCalled();
        });

        it('calls onAddressChange when accountsChanged event fires with new address', async () => {
            mockPingSession.mockResolvedValue(true);
            const listeners: Record<string, Function> = {};
            mockGetWcUniversalProvider.mockReturnValue({
                on: (event: string, handler: Function) => {
                    listeners[event] = handler;
                },
                off: vi.fn(),
            });
            mockExtractStacksAddressFromCaip10.mockReturnValue('SP456');

            const onAddressChange = vi.fn();

            await act(async () => {
                renderHook(() =>
                    useWalletConnect({
                        address: 'SP123',
                        provider: 'wallet-connect',
                        onAddressChange,
                        onDisconnect: vi.fn(),
                    })
                );
                await flushPromises();
            });

            act(() => {
                listeners['accountsChanged']!(['stacks:1:SP456']);
            });

            expect(mockExtractStacksAddressFromCaip10).toHaveBeenCalledWith([
                'stacks:1:SP456',
            ]);
            expect(onAddressChange).toHaveBeenCalledWith('SP456');
        });

        it('does not call onAddressChange when address is the same', async () => {
            mockPingSession.mockResolvedValue(true);
            const listeners: Record<string, Function> = {};
            mockGetWcUniversalProvider.mockReturnValue({
                on: (event: string, handler: Function) => {
                    listeners[event] = handler;
                },
                off: vi.fn(),
            });
            mockExtractStacksAddressFromCaip10.mockReturnValue('SP123');

            const onAddressChange = vi.fn();

            await act(async () => {
                renderHook(() =>
                    useWalletConnect({
                        address: 'SP123',
                        provider: 'wallet-connect',
                        onAddressChange,
                        onDisconnect: vi.fn(),
                    })
                );
                await flushPromises();
            });

            act(() => {
                listeners['accountsChanged']!(['stacks:1:SP123']);
            });

            expect(onAddressChange).not.toHaveBeenCalled();
        });
    });

    describe('cleanup', () => {
        it('removes listeners on unmount', async () => {
            mockPingSession.mockResolvedValue(true);
            const mockOff = vi.fn();
            mockGetWcUniversalProvider.mockReturnValue({
                on: vi.fn(),
                off: mockOff,
            });

            let unmount!: () => void;
            await act(async () => {
                const hook = renderHook(() =>
                    useWalletConnect({
                        address: 'SP123',
                        provider: 'wallet-connect',
                        onAddressChange: vi.fn(),
                        onDisconnect: vi.fn(),
                    })
                );
                unmount = hook.unmount;
                await flushPromises();
            });

            act(() => {
                unmount();
            });

            expect(mockOff).toHaveBeenCalledWith(
                'disconnect',
                expect.any(Function)
            );
            expect(mockOff).toHaveBeenCalledWith(
                'accountsChanged',
                expect.any(Function)
            );
        });

        it('logs error when off() throws on unmount', async () => {
            mockPingSession.mockResolvedValue(true);
            const removeError = new Error('Off failed');
            mockGetWcUniversalProvider.mockReturnValue({
                on: vi.fn(),
                off: () => {
                    throw removeError;
                },
            });

            const consoleSpy = vi
                .spyOn(console, 'error')
                .mockImplementation(() => {});

            let unmount!: () => void;
            await act(async () => {
                const hook = renderHook(() =>
                    useWalletConnect({
                        address: 'SP123',
                        provider: 'wallet-connect',
                        onAddressChange: vi.fn(),
                        onDisconnect: vi.fn(),
                    })
                );
                unmount = hook.unmount;
                await flushPromises();
            });

            act(() => {
                unmount();
            });

            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to remove WalletConnect listeners:',
                removeError
            );
            consoleSpy.mockRestore();
        });
    });

    describe('cancellation', () => {
        it('does not call onDisconnect if unmounted before ping resolves', async () => {
            let resolvePing!: (value: boolean) => void;
            mockPingSession.mockReturnValue(
                new Promise((resolve) => {
                    resolvePing = resolve;
                })
            );
            mockGetWcUniversalProvider.mockReturnValue({
                disconnect: vi.fn().mockResolvedValue(undefined),
                on: vi.fn(),
                off: vi.fn(),
            });

            const onDisconnect = vi.fn();

            const { unmount } = renderHook(() =>
                useWalletConnect({
                    address: 'SP123',
                    provider: 'wallet-connect',
                    onAddressChange: vi.fn(),
                    onDisconnect,
                })
            );

            unmount();

            await act(async () => {
                resolvePing(false);
                await flushPromises();
            });

            expect(onDisconnect).not.toHaveBeenCalled();
        });
    });
});
