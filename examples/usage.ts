import { MemoryTokenStore, tokenStore } from '../src/index';

// Example 1: Basic usage with global singleton
async function basicExample() {
  console.log('=== Basic Example ===');
  
  // Store a session token for 30 minutes
  await tokenStore.set('session:user123', 'jwt-token-here', 1800);
  
  // Retrieve the token
  const token = await tokenStore.get('session:user123');
  console.log('Token:', token);
  
  // Check if exists
  const exists = await tokenStore.has('session:user123');
  console.log('Token exists:', exists);
  
  // Get remaining TTL
  const ttl = await tokenStore.getTtl('session:user123');
  console.log('TTL remaining:', ttl, 'seconds');
  
  await tokenStore.delete('session:user123');
  console.log('Token deleted');
}

// Example 2: Advanced configuration
async function advancedExample() {
  console.log('\n=== Advanced Example ===');
  
  const store = new MemoryTokenStore({
    maxSize: 1000,
    defaultTtl: 3600, // 1 hour
    debug: true
  });
  
  // Store multiple tokens
  await store.set('api_key:app1', 'sk-123456', 7200); // 2 hours
  await store.set('refresh:user456', 'refresh-token', 86400); // 24 hours
  await store.set('temp:upload789', 'upload-session', 300); // 5 minutes
  
  // Get stats
  const stats = store.getStats();
  console.log('Store stats:', stats);
  
  // List all keys
  const keys = await store.keys();
  console.log('All keys:', keys);
  
  // Get metadata for a key
  const metadata = await store.getMetadata('api_key:app1');
  console.log('API key metadata:', metadata);
  
  await store.clear();
}

// Example 3: Session management system
class SessionManager {
  private store: MemoryTokenStore;
  
  constructor() {
    this.store = new MemoryTokenStore({
      maxSize: 10000,
      defaultTtl: 1800, // 30 minutes default
      debug: false
    });
  }
  
  async createSession(userId: string, sessionData: any, ttlSeconds = 1800) {
    const sessionId = `session:${userId}:${Date.now()}`;
    await this.store.set(sessionId, JSON.stringify(sessionData), ttlSeconds);
    return sessionId;
  }
  
  async getSession(sessionId: string) {
    const data = await this.store.get(sessionId);
    return data ? JSON.parse(data) : null;
  }
  
  async refreshSession(sessionId: string, newTtl = 1800) {
    const updated = await this.store.updateTtl(sessionId, newTtl);
    return updated;
  }
  
  async endSession(sessionId: string) {
    return await this.store.delete(sessionId);
  }
  
  async getActiveSessions() {
    const keys = await this.store.keys();
    return keys.filter(key => key.startsWith('session:'));
  }
  
  getStats() {
    return this.store.getStats();
  }
}

async function sessionManagerExample() {
  console.log('\n=== Session Manager Example ===');
  
  const sessionManager = new SessionManager();
  
  // Create sessions for different users
  const session1 = await sessionManager.createSession('user123', {
    username: 'alice',
    role: 'admin',
    loginTime: new Date().toISOString()
  });
  
  const session2 = await sessionManager.createSession('user456', {
    username: 'bob',
    role: 'user',
    loginTime: new Date().toISOString()
  }, 3600); // 1 hour
  
  console.log('Created sessions:', { session1, session2 });
  
  // Get session data
  const userData = await sessionManager.getSession(session1);
  console.log('User data:', userData);
  
  // Refresh session
  await sessionManager.refreshSession(session1, 3600);
  console.log('Session refreshed');
  
  // List active sessions
  const activeSessions = await sessionManager.getActiveSessions();
  console.log('Active sessions:', activeSessions);
  
  // Get manager stats
  console.log('Manager stats:', sessionManager.getStats());
  
  // Clean up
  await sessionManager.endSession(session1);
  await sessionManager.endSession(session2);
}

// Example 4: API Rate limiting with tokens
class RateLimiter {
  private store: MemoryTokenStore;
  
  constructor(private requestsPerMinute = 60) {
    this.store = new MemoryTokenStore({
      defaultTtl: 60, // 1 minute windows
      maxSize: 50000
    });
  }
  
  async checkLimit(clientId: string): Promise<boolean> {
    const key = `rate:${clientId}:${Math.floor(Date.now() / 60000)}`;
    
    const current = await this.store.get(key);
    const count = current ? parseInt(current) : 0;
    
    if (count >= this.requestsPerMinute) {
      return false; // Rate limited
    }
    
    await this.store.set(key, (count + 1).toString(), 60);
    return true; // Request allowed
  }
  
  async getRemainingRequests(clientId: string): Promise<number> {
    const key = `rate:${clientId}:${Math.floor(Date.now() / 60000)}`;
    const current = await this.store.get(key);
    const count = current ? parseInt(current) : 0;
    return Math.max(0, this.requestsPerMinute - count);
  }
}

async function rateLimiterExample() {
  console.log('\n=== Rate Limiter Example ===');
  
  const limiter = new RateLimiter(5); // 5 requests per minute
  
  const clientId = 'client123';
  
  // Simulate API requests
  for (let i = 1; i <= 7; i++) {
    const allowed = await limiter.checkLimit(clientId);
    const remaining = await limiter.getRemainingRequests(clientId);
    
    console.log(`Request ${i}: ${allowed ? 'ALLOWED' : 'RATE LIMITED'}, Remaining: ${remaining}`);
    
    if (!allowed) {
      console.log('Client would receive 429 Too Many Requests');
    }
  }
}

// Run all examples
async function runExamples() {
  try {
    await basicExample();
    await advancedExample();
    await sessionManagerExample();
    await rateLimiterExample();
  } catch (error) {
    console.error('Example error:', error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  runExamples();
}