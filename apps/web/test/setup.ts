import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/**
 * Test environment shims.
 *
 * jsdom does not implement these browser APIs, and Radix primitives use them
 * for positioning and focus management. Stubbing them here keeps individual
 * tests about behaviour rather than about jsdom's gaps.
 */
afterEach(() => cleanup());

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

window.HTMLElement.prototype.scrollIntoView ??= vi.fn();
window.HTMLElement.prototype.hasPointerCapture ??= vi.fn(() => false);
window.HTMLElement.prototype.releasePointerCapture ??= vi.fn();

if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', {
    value: { ...globalThis.crypto, randomUUID: () => '00000000-0000-4000-8000-000000000000' },
    configurable: true,
  });
}
