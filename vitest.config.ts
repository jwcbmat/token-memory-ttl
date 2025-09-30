// Ensure WebCrypto is present before Vite resolves config
import { webcrypto as nodeWebcrypto, randomFillSync } from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const __g: any = globalThis as any;
if (!__g.crypto) {
  if (nodeWebcrypto) {
    __g.crypto = nodeWebcrypto;
  } else {
    __g.crypto = {
      getRandomValues: (typedArray: ArrayBufferView) =>
        randomFillSync(typedArray as unknown as NodeJS.ArrayBufferView),
    };
  }
}
if (typeof __g.crypto.getRandomValues !== 'function') {
  __g.crypto.getRandomValues = (typedArray: ArrayBufferView) =>
    randomFillSync(typedArray as unknown as NodeJS.ArrayBufferView);
}

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['tests/**/*', 'dist/**/*'],
      thresholds: {
        global: {
          branches: 90,
          functions: 95,
          lines: 95,
          statements: 95,
        },
      },
    },
  },
});