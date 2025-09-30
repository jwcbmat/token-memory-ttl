import { MemoryTokenStore, TokenStoreOptions } from '../src/index';

export const configs = {
  development: {
    maxSize: 1000,
    defaultTtl: 3600, // 1 hour
    debug: true
  } as TokenStoreOptions,
  
  production: {
    maxSize: 100000,
    defaultTtl: 1800, // 30 minutes
    debug: false
  } as TokenStoreOptions,
  
  testing: {
    maxSize: 100,
    defaultTtl: 60, // 1 minute
    debug: false
  } as TokenStoreOptions
};

export function createTokenStore(env: keyof typeof configs = 'development'): MemoryTokenStore {
  const config = configs[env];
  if (!config) {
    throw new Error(`Unknown environment: ${env}`);
  }
  
  return new MemoryTokenStore(config);
}

async function environmentExample() {
  console.log('Environment Configuration Example');
  console.log('====================================\n');
  
  const devStore = createTokenStore('development');
  await devStore.set('dev:session', 'dev-token', 300);
  console.log('Dev store stats:', devStore.getStats());
  
  const prodStore = createTokenStore('production');
  await prodStore.set('prod:session', 'prod-token', 1800);
  console.log('Prod store stats:', prodStore.getStats());

  const testStore = createTokenStore('testing');
  await testStore.set('test:session', 'test-token', 60);
  console.log('Test store stats:', testStore.getStats());
  
  await Promise.all([
    devStore.clear(),
    prodStore.clear(),
    testStore.clear()
  ]);
}

if (require.main === module) {
  environmentExample().catch(console.error);
}