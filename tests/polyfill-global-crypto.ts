// Polyfill globalThis.crypto before Vite/Vitest resolves configuration.
// This runs at vitest.config.ts import time.
import { webcrypto as nodeWebcrypto, randomFillSync } from 'node:crypto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g: any = globalThis as any;

if (!g.crypto) {
  if (nodeWebcrypto) {
    g.crypto = nodeWebcrypto;
  } else {
    g.crypto = {
      getRandomValues: (typedArray: ArrayBufferView) =>
        randomFillSync(typedArray as unknown as NodeJS.ArrayBufferView),
    };
  }
}

if (typeof g.crypto.getRandomValues !== 'function') {
  g.crypto.getRandomValues = (typedArray: ArrayBufferView) =>
    randomFillSync(typedArray as unknown as NodeJS.ArrayBufferView);
}
