export interface TokenStoreOptions {
  /** Maximum number of tokens to store (default: unlimited) */
  maxSize?: number;
  /** Default TTL in seconds if not specified per token */
  defaultTtl?: number;
  /** Enable debug logging */
  debug?: boolean;
}

export interface TokenRecord {
  /** The stored token value */
  readonly token: string;
  /** Unix timestamp when token expires */
  readonly expiresAt: number;
  /** When the token was created */
  readonly createdAt: number;
}

export interface TokenStats {
  /** Total number of active tokens */
  size: number;
  /** Number of scheduled cleanup timers */
  pendingCleanups: number;
  /** Memory usage estimate in bytes */
  memoryUsage: number;
}

/**
 * @example
 * ```typescript
 * const store = new MemoryTokenStore();
 * 
 * // Store a token for 1 hour
 * await store.set('user:123', 'secret-token', 3600);
 * 
 * // Retrieve the token
 * const token = await store.get('user:123');
 * 
 * // Clean up
 * await store.delete('user:123');
 * ```
 */
export class MemoryTokenStore {
  private readonly map: Map<string, TokenRecord>;
  private readonly timers: Map<string, NodeJS.Timeout>;
  private readonly options: Required<TokenStoreOptions>;

  constructor(options: TokenStoreOptions = {}) {
    this.map = new Map();
    this.timers = new Map();
    this.options = {
      maxSize: options.maxSize || Number.MAX_SAFE_INTEGER,
      defaultTtl: options.defaultTtl || 3600, // 1 hour default
      debug: options.debug || false,
    };
  }

  // Node.js timers use a 32-bit signed integer for the delay and will overflow
  // for values > ~24.8 days (2^31-1 ms). If we schedule a timer above this threshold,
  // it can fire immediately (as 1ms), causing premature deletion. To avoid that,
  // we schedule in safe chunks and re-schedule until the actual expiry time.
  private scheduleExpiry(key: string, expiresAt: number) {
    const existing = this.timers.get(key);
    if (existing) clearTimeout(existing);

    const MAX_TIMEOUT_MS = 0x7fffffff; // 2,147,483,647 (~24.8 days)
    const now = Date.now();
    const remaining = expiresAt - now;

    if (remaining <= 0) {
      this.map.delete(key);
      this.timers.delete(key);
      return;
    }

    const delay = Math.min(remaining, MAX_TIMEOUT_MS);

    const t = setTimeout(() => {
      const rec = this.map.get(key);
      if (!rec) {
        this.timers.delete(key);
        return;
      }
      
      const now2 = Date.now();
      
      if (rec.expiresAt <= now2) {
        this.map.delete(key);
        this.timers.delete(key);
      } else {
        this.scheduleExpiry(key, rec.expiresAt);
      }
    }, delay);

    // Avoid keeping Node process open :)
    if (typeof t.unref === 'function') t.unref();

    this.timers.set(key, t);
  }

  /**
   * Store a token with TTL
   * @param key Unique identifier for the token
   * @param token The token value to store
   * @param ttlSeconds Time-to-live in seconds (optional, uses defaultTtl if not provided)
   */
  async set(key: string, token: string, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.options.defaultTtl;
    const now = Date.now();
    const expiresAt = now + ttl * 1000;
    
    // Check size limit
    if (!this.map.has(key) && this.map.size >= this.options.maxSize) {
      throw new Error(`Token store size limit exceeded (${this.options.maxSize})`);
    }

    const record: TokenRecord = {
      token,
      expiresAt,
      createdAt: now,
    };

    this.map.set(key, record);
    this.scheduleExpiry(key, expiresAt);

    if (this.options.debug) {
      console.log(`TokenStore: Set token '${key}' with TTL ${ttl}s`);
    }
  }

  /**
   * Retrieve a token by key
   * @param key The token identifier
   * @returns The token value or null if not found/expired
   */
  async get(key: string): Promise<string | null> {
    const record = this.map.get(key);
    if (!record) return null;
    
    if (record.expiresAt <= Date.now()) {
      await this.delete(key);
      return null;
    }

    if (this.options.debug) {
      console.log(`TokenStore: Retrieved token '${key}'`);
    }

    return record.token;
  }

  /**
   * Delete a token manually
   * @param key The token identifier
   * @returns True if token existed and was deleted
   */
  async delete(key: string): Promise<boolean> {
    const existed = this.map.delete(key);
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }

    if (this.options.debug && existed) {
      console.log(`TokenStore: Deleted token '${key}'`);
    }

    return existed;
  }

  /**
   * Check if a token exists and is not expired
   * @param key The token identifier
   */
  async has(key: string): Promise<boolean> {
    const record = this.map.get(key);
    if (!record) return false;
    
    if (record.expiresAt <= Date.now()) {
      await this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get token metadata without retrieving the token value
   * @param key The token identifier
   */
  async getMetadata(key: string): Promise<Omit<TokenRecord, 'token'> | null> {
    const record = this.map.get(key);
    if (!record) return null;
    
    if (record.expiresAt <= Date.now()) {
      await this.delete(key);
      return null;
    }
    
    return {
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
    };
  }

  /**
   * Get remaining TTL for a token in seconds
   * @param key The token identifier
   * @returns Remaining seconds or null if token doesn't exist
   */
  async getTtl(key: string): Promise<number | null> {
    const record = this.map.get(key);
    if (!record) return null;
    
    const remaining = Math.max(0, record.expiresAt - Date.now());
    if (remaining === 0) {
      await this.delete(key);
      return null;
    }
    
    return Math.ceil(remaining / 1000);
  }

  /**
   * Update TTL for an existing token
   * @param key The token identifier  
   * @param ttlSeconds New TTL in seconds
   * @returns True if token existed and TTL was updated
   */
  async updateTtl(key: string, ttlSeconds: number): Promise<boolean> {
    const record = this.map.get(key);
    if (!record) return false;
    
    const newExpiresAt = Date.now() + ttlSeconds * 1000;
    const updatedRecord: TokenRecord = {
      ...record,
      expiresAt: newExpiresAt,
    };
    
    this.map.set(key, updatedRecord);
    this.scheduleExpiry(key, newExpiresAt);
    
    if (this.options.debug) {
      console.log(`TokenStore: Updated TTL for '${key}' to ${ttlSeconds}s`);
    }
    
    return true;
  }

  /**
   * Clear all tokens and timers
   */
  async clear(): Promise<void> {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.map.clear();
    this.timers.clear();
    
    if (this.options.debug) {
      console.log('TokenStore: Cleared all tokens');
    }
  }

  /**
   * Get all token keys (excluding expired ones)
   */
  async keys(): Promise<string[]> {
    const now = Date.now();
    const validKeys: string[] = [];
    
    for (const [key, record] of this.map.entries()) {
      if (record.expiresAt > now) {
        validKeys.push(key);
      } else {
        // Clean up expired tokens
        await this.delete(key);
      }
    }
    
    return validKeys;
  }

  /**
   * Get store statistics
   */
  getStats(): TokenStats {
    const records = Array.from(this.map.values());
    const estimatedBytes = records.reduce((acc, record) => 
      acc + record.token.length * 2 + 32, 0);
    
    return {
      size: this.map.size,
      pendingCleanups: this.timers.size,
      memoryUsage: estimatedBytes,
    };
  }
}

/**
 * Global singleton instance for convenience
 * Use this for simple use cases or when you need a shared store across your application
 */
declare global {
  // eslint-disable-next-line no-var
  var __tokenMemoryTtlStore: MemoryTokenStore | undefined;
}

export const tokenStore: MemoryTokenStore = 
  globalThis.__tokenMemoryTtlStore || new MemoryTokenStore();
globalThis.__tokenMemoryTtlStore = tokenStore;