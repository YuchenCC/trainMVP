import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// ========== Ant Design jsdom 兼容性 mock ==========

// matchMedia mock（Ant Design 响应式组件依赖）
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// getComputedStyle mock（Ant Design 部分组件依赖）
const originalGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = (elt: Element, pseudoElt?: string | null) => {
  const style = originalGetComputedStyle(elt, pseudoElt);
  return style;
};

// scrollTo mock（jsdom 不支持）
window.scrollTo = vi.fn() as any;
Element.prototype.scrollTo = vi.fn() as any;