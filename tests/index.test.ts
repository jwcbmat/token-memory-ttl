import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MemoryTokenStore, tokenStore } from '../src/index';

describe('MemoryTokenStore', () => {
  let store: MemoryTokenStore;

  beforeEach(() => {
    store = new MemoryTokenStore();
  });

  afterEach(async () => {
    await store.clear();
  });

  describe('Basic Operations', () => {
    it('should set and get a token', async () => {
      await store.set('mykey', 'token123', 60);
      expect(await store.get('mykey')).toBe('token123');
    });

    it('should return null for non-existent token', async () => {
      expect(await store.get('nonexistent')).toBeNull();
    });

    it('should delete a token', async () => {
      await store.set('mykey', 'token123', 60);
      const deleted = await store.delete('mykey');
      expect(deleted).toBe(true);
      expect(await store.get('mykey')).toBeNull();
    });

    it('should return false when deleting non-existent token', async () => {
      const deleted = await store.delete('nonexistent');
      expect(deleted).toBe(false);
    });

    it('should check if token exists', async () => {
      await store.set('mykey', 'token123', 60);
      expect(await store.has('mykey')).toBe(true);
      expect(await store.has('nonexistent')).toBe(false);
    });
  });

  describe('TTL and Expiration', () => {
    it('should expire token after TTL', async () => {
      await store.set('mykey', 'token123', 1);
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(await store.get('mykey')).toBeNull();
    });

    it('should use default TTL when not specified', async () => {
      const storeWithDefaults = new MemoryTokenStore({ defaultTtl: 2 });
      await storeWithDefaults.set('mykey', 'token123');
      expect(await storeWithDefaults.get('mykey')).toBe('token123');
      await storeWithDefaults.clear();
    });

    it('should get remaining TTL', async () => {
      await store.set('mykey', 'token123', 60);
      const ttl = await store.getTtl('mykey');
      expect(ttl).toBeGreaterThan(55);
      expect(ttl).toBeLessThanOrEqual(60);
    });

    it('should return null TTL for non-existent token', async () => {
      expect(await store.getTtl('nonexistent')).toBeNull();
    });

    it('should update TTL for existing token', async () => {
      await store.set('mykey', 'token123', 60);
      const updated = await store.updateTtl('mykey', 120);
      expect(updated).toBe(true);
      
      const ttl = await store.getTtl('mykey');
      expect(ttl).toBeGreaterThan(115);
      expect(ttl).toBeLessThanOrEqual(120);
    });

    it('should return false when updating TTL for non-existent token', async () => {
      const updated = await store.updateTtl('nonexistent', 60);
      expect(updated).toBe(false);
    });
  });

  describe('Metadata Operations', () => {
    it('should get token metadata', async () => {
      const now = Date.now();
      await store.set('mykey', 'token123', 60);
      
      const metadata = await store.getMetadata('mykey');
      expect(metadata).toBeDefined();
      expect(metadata!.createdAt).toBeGreaterThanOrEqual(now);
      expect(metadata!.expiresAt).toBeGreaterThan(now);
    });

    it('should return null metadata for non-existent token', async () => {
      expect(await store.getMetadata('nonexistent')).toBeNull();
    });

    it('should get all valid keys', async () => {
      await store.set('key1', 'token1', 60);
      await store.set('key2', 'token2', 60);
      await store.set('key3', 'token3', 1); // This will expire
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const keys = await store.keys();
      expect(keys).toHaveLength(2);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).not.toContain('key3');
    });
  });

  describe('Store Management', () => {
    it('should clear all tokens', async () => {
      await store.set('key1', 'token1', 60);
      await store.set('key2', 'token2', 60);
      
      await store.clear();
      
      expect(await store.get('key1')).toBeNull();
      expect(await store.get('key2')).toBeNull();
      expect(store.getStats().size).toBe(0);
    });

    it('should provide accurate statistics', async () => {
      await store.set('key1', 'token1', 60);
      await store.set('key2', 'token2', 60);
      
      const stats = store.getStats();
      expect(stats.size).toBe(2);
      expect(stats.pendingCleanups).toBe(2);
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });

    it('should respect max size limit', async () => {
      const limitedStore = new MemoryTokenStore({ maxSize: 2 });
      
      await limitedStore.set('key1', 'token1', 60);
      await limitedStore.set('key2', 'token2', 60);
      
      await expect(limitedStore.set('key3', 'token3', 60))
        .rejects.toThrow('Token store size limit exceeded');
        
      await limitedStore.clear();
    });

    it('should allow overwriting existing tokens without size limit check', async () => {
      const limitedStore = new MemoryTokenStore({ maxSize: 1 });
      
      await limitedStore.set('key1', 'token1', 60);
      await limitedStore.set('key1', 'token2', 60);
      
      expect(await limitedStore.get('key1')).toBe('token2');
      await limitedStore.clear();
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle very long TTL values safely', async () => {
      const longTtl = 30 * 24 * 60 * 60; // 30 days
      await store.set('longkey', 'token123', longTtl);
      
      expect(await store.get('longkey')).toBe('token123');
      const ttl = await store.getTtl('longkey');
      expect(ttl).toBeGreaterThan(longTtl - 5);
    });

    it('should handle concurrent operations', async () => {
      const promises = [];
      
      for (let i = 0; i < 100; i++) {
        promises.push(store.set(`key${i}`, `token${i}`, 60));
      }
      
      await Promise.all(promises);
      
      const keys = await store.keys();
      expect(keys).toHaveLength(100);
      
      const getPromises = keys.map(key => store.get(key));
      const tokens = await Promise.all(getPromises);
      
      expect(tokens.every(token => token !== null)).toBe(true);
    });

    it('should clean up expired tokens during operations', async () => {
      await store.set('expiring', 'token123', 1);
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // These operations should clean up the expired token
      expect(await store.has('expiring')).toBe(false);
      expect(await store.getMetadata('expiring')).toBeNull();
      expect(await store.getTtl('expiring')).toBeNull();
      
      const keys = await store.keys();
      expect(keys).not.toContain('expiring');
    });
  });

  describe('Configuration Options', () => {
    it('should enable debug logging when configured', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const debugStore = new MemoryTokenStore({ debug: true });
      
      await debugStore.set('key1', 'token1', 60);
      await debugStore.get('key1');
      await debugStore.delete('key1');
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('TokenStore:'));
      
      consoleSpy.mockRestore();
      await debugStore.clear();
    });

    it('should not log when debug is disabled (default)', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      await store.set('key1', 'token1', 60);
      await store.get('key1');
      await store.delete('key1');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Global Singleton', () => {
    it('should provide a global singleton instance', () => {
      expect(tokenStore).toBeInstanceOf(MemoryTokenStore);
    });

    it('should reuse the same global instance across imports', () => {
      expect(tokenStore).toBe(tokenStore);
      expect(globalThis.__tokenMemoryTtlStore).toBe(tokenStore);
    });
  });

  describe('Memory Safety', () => {
    it('should not keep Node.js process alive with timers', async () => {
      await store.set('key1', 'token1', 60);
      
      expect(store.getStats().pendingCleanups).toBe(1);
      
      await store.clear();
      expect(store.getStats().pendingCleanups).toBe(0);
    });
  });
});