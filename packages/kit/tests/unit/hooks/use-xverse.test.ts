// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSelectedProvider = vi.fn();
vi.mock('@stacks/connect', () => ({
    getSelectedProvider: mockGetSelectedProvider,
}));

const mockWaitForXverseProvider = vi.fn();
const mockGetXverseProductInfo = vi.fn();
const mockShouldSupportAccountChange = vi.fn();
const mockExtractAndValidateStacksAddress = vi.fn();

vi.mock('../../../src/hooks/use-xverse/use-xverse.helpers', () => ({
    waitForXverseProvider: mockWaitForXverseProvider,
    getXverseProductInfo: mockGetXverseProductInfo,
    shouldSupportAccountChange: mockShouldSupportAccountChange,
    extractAndValidateStacksAddress: mockExtractAndValidateStacksAddress,
}));

const { useXverse } = await import(
    '../../../src/hooks/use-xverse/use-xverse'
);

const flushPromises = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
    mockGetSelectedProvider.mockReset();
    mockWaitForXverseProvider.mockReset();
    mockGetXverseProductInfo.mockReset();
    mockShouldSupportAccountChange.mockReset();
    mockExtractAndValidateStacksAddress.mockReset();
});

describe('useXverse', () => {
    describe('non-xverse provider', () => {
        it('does not run effects when provider is not xverse', () => {
            renderHook(() =>
                useXverse({
                    address: 'SP123',
                    provider: 'leather',
                    onAddressChange: vi.fn(),
                    connect: vi.fn(),
                })
            );

            expect(mockWaitForXverseProvider).not.toHaveBeenCalled();
        });

        it('does not run effects when provider is undefined', () => {
            renderHook(() =>
                useXverse({
                    address: undefined,
                    provider: undefined,
                    onAddressChange: vi.fn(),
                    connect: vi.fn(),
                })
            );

            expect(mockWaitForXverseProvider).not.toHaveBeenCalled();
        });
    });

    describe('provider readiness', () => {
        it('calls waitForXverseProvider when provider is xverse', async () => {
            mockWaitForXverseProvider.mockResolvedValue(true);
            mockGetXverseProductInfo.mockResolvedValue({ version: '2.0.0' });
            mockShouldSupportAccountChange.mockReturnValue(true);
            mockGetSelectedProvider.mockReturnValue({
                request: vi.fn().mockResolvedValue({ result: { addresses: [] } }),
                addListener: vi.fn().mockReturnValue(vi.fn()),
            });

            await act(async () => {
                renderHook(() =>
                    useXverse({
                        address: 'SP123',
                        provider: 'xverse',
                        onAddressChange: vi.fn(),
                        connect: vi.fn(),
                    })
                );
                await flushPromises();
            });

            expect(mockWaitForXverseProvider).toHaveBeenCalled();
        });

        it('logs error when provider fails to initialize', async () => {
            mockWaitForXverseProvider.mockResolvedValue(false);
            const consoleSpy = vi
                .spyOn(console, 'error')
                .mockImplementation(() => {});

            await act(async () => {
                renderHook(() =>
                    useXverse({
                        address: 'SP123',
                        provider: 'xverse',
                        onAddressChange: vi.fn(),
                        connect: vi.fn(),
                    })
                );
                await flushPromises();
            });

            expect(consoleSpy).toHaveBeenCalledWith(
                'Xverse provider failed to initialize'
            );
            consoleSpy.mockRestore();
        });
    });

    describe('listener setup', () => {
        it('skips setup when shouldSupportAccountChange returns false', async () => {
            mockWaitForXverseProvider.mockResolvedValue(true);
            mockGetXverseProductInfo.mockResolvedValue({ version: '1.0.0' });
            mockShouldSupportAccountChange.mockReturnValue(false);

            await act(async () => {
                renderHook(() =>
                    useXverse({
                        address: 'SP123',
                        provider: 'xverse',
                        onAddressChange: vi.fn(),
                        connect: vi.fn(),
                    })
                );
                await flushPromises();
            });

            expect(mockShouldSupportAccountChange).toHaveBeenCalledWith(
                '1.0.0'
            );
            expect(mockGetSelectedProvider).not.toHaveBeenCalled();
        });

        it('calls wallet_connect and addListener on setup', async () => {
            mockWaitForXverseProvider.mockResolvedValue(true);
            mockGetXverseProductInfo.mockResolvedValue({ version: '2.0.0' });
            mockShouldSupportAccountChange.mockReturnValue(true);

            const mockProviderRequest = vi
                .fn()
                .mockResolvedValue({ result: { addresses: [] } });
            const mockAddListener = vi.fn().mockReturnValue(vi.fn());
            mockGetSelectedProvider.mockReturnValue({
                request: mockProviderRequest,
                addListener: mockAddListener,
            });

            await act(async () => {
                renderHook(() =>
                    useXverse({
                        address: 'SP123',
                        provider: 'xverse',
                        onAddressChange: vi.fn(),
                        connect: vi.fn(),
                    })
                );
                await flushPromises();
            });

            expect(mockProviderRequest).toHaveBeenCalledWith(
                'wallet_connect',
                null
            );
            expect(mockAddListener).toHaveBeenCalledWith(
                'accountChange',
                expect.any(Function)
            );
        });

        it('calls extractAndValidateStacksAddress with wallet_connect response', async () => {
            mockWaitForXverseProvider.mockResolvedValue(true);
            mockGetXverseProductInfo.mockResolvedValue({ version: '2.0.0' });
            mockShouldSupportAccountChange.mockReturnValue(true);

            const mockAddresses = [
                {
                    address: 'SP456',
                    publicKey: 'pk',
                    purpose: 'stacks',
                    addressType: 'stacks',
                    walletType: 'software',
                },
            ];
            const mockProviderRequest = vi.fn().mockResolvedValue({
                result: { addresses: mockAddresses },
            });
            const mockAddListener = vi.fn().mockReturnValue(vi.fn());
            mockGetSelectedProvider.mockReturnValue({
                request: mockProviderRequest,
                addListener: mockAddListener,
            });

            const onAddressChange = vi.fn();

            await act(async () => {
                renderHook(() =>
                    useXverse({
                        address: 'SP123',
                        provider: 'xverse',
                        onAddressChange,
                        connect: vi.fn(),
                    })
                );
                await flushPromises();
            });

            expect(
                mockExtractAndValidateStacksAddress
            ).toHaveBeenCalledWith(
                mockAddresses,
                'SP123',
                onAddressChange,
                expect.any(Function)
            );
        });

        it('fires extractAndValidateStacksAddress on accountChange event', async () => {
            mockWaitForXverseProvider.mockResolvedValue(true);
            mockGetXverseProductInfo.mockResolvedValue({ version: '2.0.0' });
            mockShouldSupportAccountChange.mockReturnValue(true);

            let capturedHandler!: (event: unknown) => void;
            const mockAddListener = vi
                .fn()
                .mockImplementation((_event: string, handler: (event: unknown) => void) => {
                    capturedHandler = handler;
                    return vi.fn();
                });
            mockGetSelectedProvider.mockReturnValue({
                request: vi
                    .fn()
                    .mockResolvedValue({ result: { addresses: [] } }),
                addListener: mockAddListener,
            });

            const onAddressChange = vi.fn();

            await act(async () => {
                renderHook(() =>
                    useXverse({
                        address: 'SP123',
                        provider: 'xverse',
                        onAddressChange,
                        connect: vi.fn(),
                    })
                );
                await flushPromises();
            });

            // Reset to only check the accountChange call
            mockExtractAndValidateStacksAddress.mockReset();

            const accountEvent = {
                type: 'accountChange',
                addresses: [
                    {
                        address: 'SP789',
                        publicKey: 'pk',
                        purpose: 'stacks',
                        addressType: 'stacks',
                        walletType: 'software',
                    },
                ],
            };

            act(() => {
                capturedHandler(accountEvent);
            });

            expect(
                mockExtractAndValidateStacksAddress
            ).toHaveBeenCalledWith(
                accountEvent.addresses,
                'SP123',
                onAddressChange,
                expect.any(Function)
            );
        });
    });

    describe('cleanup', () => {
        it('calls removeListener on unmount', async () => {
            mockWaitForXverseProvider.mockResolvedValue(true);
            mockGetXverseProductInfo.mockResolvedValue({ version: '2.0.0' });
            mockShouldSupportAccountChange.mockReturnValue(true);

            const mockRemoveListener = vi.fn();
            mockGetSelectedProvider.mockReturnValue({
                request: vi
                    .fn()
                    .mockResolvedValue({ result: { addresses: [] } }),
                addListener: vi.fn().mockReturnValue(mockRemoveListener),
            });

            let unmount!: () => void;
            await act(async () => {
                const hook = renderHook(() =>
                    useXverse({
                        address: 'SP123',
                        provider: 'xverse',
                        onAddressChange: vi.fn(),
                        connect: vi.fn(),
                    })
                );
                unmount = hook.unmount;
                await flushPromises();
            });

            act(() => {
                unmount();
            });

            expect(mockRemoveListener).toHaveBeenCalled();
        });

        it('logs error when removeListener throws on unmount', async () => {
            mockWaitForXverseProvider.mockResolvedValue(true);
            mockGetXverseProductInfo.mockResolvedValue({ version: '2.0.0' });
            mockShouldSupportAccountChange.mockReturnValue(true);

            const removeError = new Error('Remove failed');
            mockGetSelectedProvider.mockReturnValue({
                request: vi
                    .fn()
                    .mockResolvedValue({ result: { addresses: [] } }),
                addListener: vi.fn().mockReturnValue(() => {
                    throw removeError;
                }),
            });

            const consoleSpy = vi
                .spyOn(console, 'error')
                .mockImplementation(() => {});

            let unmount!: () => void;
            await act(async () => {
                const hook = renderHook(() =>
                    useXverse({
                        address: 'SP123',
                        provider: 'xverse',
                        onAddressChange: vi.fn(),
                        connect: vi.fn(),
                    })
                );
                unmount = hook.unmount;
                await flushPromises();
            });

            act(() => {
                unmount();
            });

            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to remove Xverse listener:',
                removeError
            );
            consoleSpy.mockRestore();
        });
    });

    describe('cancellation', () => {
        it('does not update state after unmount during first effect', async () => {
            let resolveWait!: (value: boolean) => void;
            mockWaitForXverseProvider.mockReturnValue(
                new Promise((resolve) => {
                    resolveWait = resolve;
                })
            );

            const consoleSpy = vi
                .spyOn(console, 'error')
                .mockImplementation(() => {});

            const { unmount } = renderHook(() =>
                useXverse({
                    address: 'SP123',
                    provider: 'xverse',
                    onAddressChange: vi.fn(),
                    connect: vi.fn(),
                })
            );

            // Unmount before the provider check resolves
            unmount();

            // Resolve after unmount — should not cause errors
            await act(async () => {
                resolveWait(true);
                await flushPromises();
            });

            // The second effect should never run since isProviderReady was never set
            expect(mockGetXverseProductInfo).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});
