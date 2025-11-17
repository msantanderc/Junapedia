import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, 'pluxee-junaeb-guide.tsx');
const content = fs.readFileSync(filePath, 'utf8');

function extractInitialStoresCount(text) {
  const start = text.indexOf('const initialStores = [');
  if (start === -1) return 0;
  const slice = text.slice(start);
  // find matching closing bracket for the array by searching for '];' after start
  const end = slice.indexOf('];');
  if (end === -1) return 0;
  const arrayText = slice.slice(0, end);
  // count occurrences of "id: '" as heuristic for number of objects
  const matches = arrayText.match(/\b id\s*:\s*['\"]/g) || arrayText.match(/\bid\s*:\s*['\"]/g) || arrayText.match(/\{\s*id\s*:/g);
  if (!matches) {
    // fallback: count occurrences of "name: '" which should exist for almost all
    const m2 = arrayText.match(/name\s*:\s*['\"]/g);
    return m2 ? m2.length : 0;
  }
  return matches.length;
}

const initialCount = extractInitialStoresCount(content);

function simulateSeed(collectionEmpty, seedCount) {
  // Our app uses a quick check getDocs(limit(1)) => 1 read if collection exists or 1 read to confirm empty
  const reads = 1; // quick check
  const writes = seedCount; // batch.set per store
  const deletes = 0;
  return { reads, writes, deletes, totalRequests: reads + writes + deletes };
}

function simulateAddSingle(currentCount) {
  // addStore uses saveStores which does batch.set for newStore and batch.delete for missing prev ids.
  // With our improved approach, there is no full collection read. So writes=1, deletes=0, reads=0
  return { reads: 0, writes: 1, deletes: 0, totalRequests: 1 };
}

function simulateSaveStores_prevImplementation(prevCount, newCount) {
  // prev implementation did getDocs(collection) => prevCount reads
  // then batch.set for newCount writes
  // batch.delete for prevCount - newCount (if positive)
  const reads = prevCount;
  const writes = newCount;
  const deletes = Math.max(0, prevCount - newCount);
  return { reads, writes, deletes, totalRequests: reads + writes + deletes };
}

function simulateSaveStores_current(prevCount, newCount) {
  // current implementation avoids reading full collection; uses prevIdsRef
  // thus reads=0, writes=newCount, deletes = number of prev ids not in new (we'll assume deletes = max(0, prev-new))
  const reads = 0;
  const writes = newCount;
  const deletes = Math.max(0, prevCount - newCount);
  return { reads, writes, deletes, totalRequests: reads + writes + deletes };
}

console.log('Detected initialStores count (heuristic):', initialCount);
console.log('--- Scenarios ---');

console.log('\n1) Seed when collection is empty (loadInitialData):');
console.log(simulateSeed(true, initialCount));

console.log('\n2) Add a single store (addStore):');
console.log(simulateAddSingle(initialCount));

console.log('\n3) Save after modifying list (previous implementation that read full collection):');
console.log('Example: prevCount =', initialCount, ', newCount =', initialCount + 2);
console.log(simulateSaveStores_prevImplementation(initialCount, initialCount + 2));

console.log('\n4) Save after modifying list (current implementation with prevIdsRef):');
console.log('Example: prevCount =', initialCount, ', newCount =', initialCount + 2);
console.log(simulateSaveStores_current(initialCount, initialCount + 2));

console.log('\n5) Delete 10 stores (previous vs current):');
console.log('prevCount =', initialCount, ', newCount =', Math.max(0, initialCount - 10));
console.log('prev impl:', simulateSaveStores_prevImplementation(initialCount, Math.max(0, initialCount - 10)));
console.log('current impl:', simulateSaveStores_current(initialCount, Math.max(0, initialCount - 10)));

console.log('\nNotes:');
console.log('- "reads" here refers to Firestore document reads (getDoc/getDocs).');
console.log('- "writes" and "deletes" are server write operations (batched).');
console.log('- Total requests = reads + writes + deletes (approx. HTTP ops).');

