// Ensure Web Crypto API compatibility in Node test environment (Node 16/18)
// Vitest/Vite may expect globalThis.crypto.getRandomValues to exist.

import { randomFillSync, webcrypto as nodeWebcrypto } from 'node:crypto';
type WebCrypto = typeof nodeWebcrypto;

// Prefer Node's webcrypto when available; otherwise shim getRandomValues
if (!(globalThis as any).crypto) {
  if (nodeWebcrypto) {
    // Assign Node's WebCrypto implementation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).crypto = nodeWebcrypto as unknown as WebCrypto;
  } else {
    // Minimal shim sufficient for Vite/Vitest usage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).crypto = {
      getRandomValues: (typedArray: ArrayBufferView) => randomFillSync(typedArray as unknown as NodeJS.ArrayBufferView),
    } as Partial<WebCrypto>;
  }
}

if (typeof (globalThis as any).crypto.getRandomValues !== 'function') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((globalThis as any).crypto as any).getRandomValues = (typedArray: ArrayBufferView) => randomFillSync(typedArray as unknown as NodeJS.ArrayBufferView);
}
