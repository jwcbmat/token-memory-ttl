# Token Memory TTL

In-memory token storage with TTL (Time-To-Live) and automatic cleanup of expired entries. Minimal implementation, no external dependencies, full TypeScript support, and builds for both ESM and CommonJS.

This project aims to provide a predictable and safe solution for scenarios where temporary tokens must be kept in memory (for example, sessions, verification codes, temporary keys), with automatic cleanup after the configured time and without keeping the Node process alive unnecessarily.

Português (Brasil): [README.pt-BR.md](./README.pt-BR.md)

## Table of contents

- [Motivation](#motivation)
- [Requirements](#requirements)
- [Installation](#installation)
- [How it works](#how-it-works)
- [Quick start](#quick-start)
- [API](#api)
- [Usage patterns](#usage-patterns)
- [Limitations and considerations](#limitations-and-considerations)
- [Testing and quality](#testing-and-quality)
- [License](#license)

## Motivation

In many applications, the overhead of integrating an external database for ephemeral data is not justified. An in-memory map can solve it with minimal latency and simplicity. However, there are challenges: ensure correct expiration, avoid memory leaks, and handle Node.js timer limits for long TTLs (> 24 days). This library addresses those points directly and with clear behavior.

## Requirements

- Node.js >= 18
- TypeScript optional (types included)

## Installation

```bash
npm install @jwcbphy/token-memory-ttl
```

## How it works

Entries are stored in a `Map<string, { token, createdAt, expiresAt }>` in memory. For each key, an expiration timer is scheduled. Because Node.js uses a 32-bit signed integer for timer delays, values above ~24.8 days can overflow. To avoid premature triggers, we schedule in safe chunks: when the remaining time exceeds the safe limit, we schedule the next step and re-schedule until the final deadline. Long TTLs are honored reliably.

Timers are `unref()`-ed when supported, which means they do not keep the Node process alive. On read operations (`get`, `has`, `getMetadata`, `getTtl`, `keys`), expired items are opportunistically cleaned up to reduce accumulation of stale entries.

## Quick start

### ESM/TypeScript

```ts
import { MemoryTokenStore } from '@jwcbphy/token-memory-ttl';

const store = new MemoryTokenStore();
await store.set('user:123', 'token', 3600);
const token = await store.get('user:123');
```

### CommonJS

```js
const { MemoryTokenStore, tokenStore } = require('@jwcbphy/token-memory-ttl');

const store = new MemoryTokenStore();
store.set('k', 'v', 60).then(() => store.get('k'));
```

### Global instance

```ts
import { tokenStore } from '@jwcbphy/token-memory-ttl';

await tokenStore.set('session:abc', 'data', 1800);
const session = await tokenStore.get('session:abc');
```

## API

### Constructor options

```ts
interface TokenStoreOptions {
  maxSize?: number;     // maximum number of keys (default: unlimited)
  defaultTtl?: number;  // default TTL in seconds (default: 3600)
  debug?: boolean;      // minimal debug logs (default: false)
}
```

### Core methods

- `set(key: string, token: string, ttlSeconds?: number): Promise<void>`
  - Stores a token with TTL. Uses `defaultTtl` when `ttlSeconds` is not provided.

- `get(key: string): Promise<string | null>`
  - Returns the token if present and valid; otherwise `null`.

- `delete(key: string): Promise<boolean>`
  - Removes the key and returns `true` if it existed.

- `has(key: string): Promise<boolean>`
  - Indicates if the key exists and is valid.

### Metadata

- `getMetadata(key: string): Promise<{ createdAt: number; expiresAt: number } | null>`
  - Returns item metadata without exposing the token value.

- `getTtl(key: string): Promise<number | null>`
  - Returns remaining TTL in seconds.

- `updateTtl(key: string, ttlSeconds: number): Promise<boolean>`
  - Updates the TTL of an existing key.

### Management

- `keys(): Promise<string[]>`
  - Lists valid (non-expired) keys.

- `clear(): Promise<void>`
  - Removes all keys and cancels timers.

- `getStats(): { size: number; pendingCleanups: number; memoryUsage: number }`
  - Approximate store statistics.

## Usage patterns

### Session

```ts
await tokenStore.set(`session:${sessionId}`, userData, 1800);
const session = await tokenStore.get(`session:${sessionId}`);
```

### API key cache

```ts
const apiKeyStore = new MemoryTokenStore({ defaultTtl: 3600, maxSize: 5000 });
await apiKeyStore.set(`api_key:${keyHash}`, userPermissions, 3600);
const permissions = await apiKeyStore.get(`api_key:${keyHash}`);
```

### Temporary data

```ts
await tokenStore.set(`upload:${uploadId}`, uploadConfig, 300);
await tokenStore.set(`verify:${email}`, verificationCode, 600);
await tokenStore.set(`reset:${userId}`, resetToken, 1800);
```

## Limitations and considerations

- Persistence: storage is memory-only; a process restart clears the data.
- Security: the library does not encrypt values; store already-safe tokens (e.g., JWT) or non-sensitive data.
- Memory: per-entry cost includes key, value, metadata, and timer references. Use `maxSize` to control growth.
- Timers: for very long TTLs, scheduling is segmented due to Node limits; this avoids unintended immediate triggers.
- Environment: timers are unref'd when available and will not keep the process alive; useful for CLIs and short-lived jobs.

## Testing and quality

- Tests with `vitest`, covering basic ops, expiration, concurrency, and long TTL.
- TypeScript typings included (`.d.ts`) and type-check via `tsc --noEmit`.
- Lint with `eslint` + `@typescript-eslint`.

## License

MIT © [jwcbmat](https://github.com/jwcbmat)

Useful links:

- Repository: https://github.com/jwcbmat/token-memory-ttl
- npm package: https://www.npmjs.com/package/@jwcbphy/token-memory-ttl
- Issues: https://github.com/jwcbmat/token-memory-ttl/issues

<p align="center">
  Made with :heart: by <a href="https://github.com/jwcbmat" target="_blank">jwcbmat</a>
</p>