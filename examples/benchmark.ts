import { MemoryTokenStore } from '../src/index';

async function benchmark() {
  const store = new MemoryTokenStore();
  const iterations = 100000;
  
  console.log(`Running ${iterations.toLocaleString()} operations each\n`);
  
  console.log('SET Operations:');
  const setStart = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    await store.set(`key${i}`, `token${i}`, 3600);
  }
  
  const setEnd = performance.now();
  const setTime = setEnd - setStart;
  const setOpsPerSec = Math.round(iterations / (setTime / 1000));
  
  console.log(`   Time: ${setTime.toFixed(2)}ms`);
  console.log(`   Rate: ${setOpsPerSec.toLocaleString()} ops/sec`);
  console.log(`   Avg:  ${(setTime / iterations).toFixed(4)}ms per operation\n`);
  
  console.log('GET Operations:');
  const getStart = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    await store.get(`key${i}`);
  }
  
  const getEnd = performance.now();
  const getTime = getEnd - getStart;
  const getOpsPerSec = Math.round(iterations / (getTime / 1000));
  
  console.log(`   Time: ${getTime.toFixed(2)}ms`);
  console.log(`   Rate: ${getOpsPerSec.toLocaleString()} ops/sec`);
  console.log(`   Avg:  ${(getTime / iterations).toFixed(4)}ms per operation\n`);
  
  console.log('HAS Operations:');
  const hasStart = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    await store.has(`key${i}`);
  }
  
  const hasEnd = performance.now();
  const hasTime = hasEnd - hasStart;
  const hasOpsPerSec = Math.round(iterations / (hasTime / 1000));
  
  console.log(`   Time: ${hasTime.toFixed(2)}ms`);
  console.log(`   Rate: ${hasOpsPerSec.toLocaleString()} ops/sec`);
  console.log(`   Avg:  ${(hasTime / iterations).toFixed(4)}ms per operation\n`);
  
  console.log('  DELETE Operations:');
  const deleteStart = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    await store.delete(`key${i}`);
  }
  
  const deleteEnd = performance.now();
  const deleteTime = deleteEnd - deleteStart;
  const deleteOpsPerSec = Math.round(iterations / (deleteTime / 1000));
  
  console.log(`   Time: ${deleteTime.toFixed(2)}ms`);
  console.log(`   Rate: ${deleteOpsPerSec.toLocaleString()} ops/sec`);
  console.log(`   Avg:  ${(deleteTime / iterations).toFixed(4)}ms per operation\n`);
  
  console.log('Memory Usage Test:');
  const memoryStore = new MemoryTokenStore();
  const testSize = 10000;
  
  for (let i = 0; i < testSize; i++) {
    await memoryStore.set(`mem_test_${i}`, `token_value_${i}_${'x'.repeat(50)}`, 3600);
  }
  
  const stats = memoryStore.getStats();
  console.log(`   Tokens: ${stats.size.toLocaleString()}`);
  console.log(`   Memory: ${(stats.memoryUsage / 1024).toFixed(2)} KB`);
  console.log(`   Avg/token: ${(stats.memoryUsage / stats.size).toFixed(2)} bytes`);
  console.log(`   Timers: ${stats.pendingCleanups.toLocaleString()}\n`);
  
  await memoryStore.clear();
  
  console.log('Concurrent Operations Test:');
  const concurrentStore = new MemoryTokenStore();
  const concurrentOps = 1000;
  
  const concurrentStart = performance.now();
  
  const promises = [];
  for (let i = 0; i < concurrentOps; i++) {
    promises.push(concurrentStore.set(`concurrent_${i}`, `value_${i}`, 3600));
  }
  for (let i = 0; i < concurrentOps; i++) {
    promises.push(concurrentStore.get(`concurrent_${i}`));
  }
  
  await Promise.all(promises);
  
  const concurrentEnd = performance.now();
  const concurrentTime = concurrentEnd - concurrentStart;
  const concurrentOpsPerSec = Math.round((concurrentOps * 2) / (concurrentTime / 1000));
  
  console.log(`   Mixed ops: ${(concurrentOps * 2).toLocaleString()}`);
  console.log(`   Time: ${concurrentTime.toFixed(2)}ms`);
  console.log(`   Rate: ${concurrentOpsPerSec.toLocaleString()} ops/sec\n`);
  
  await concurrentStore.clear();
  
  console.log('✅ Benchmark completed!');
}

// Only run if this file is executed directly
if (require.main === module) {
  benchmark().catch(console.error);
}