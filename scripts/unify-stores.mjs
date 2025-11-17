#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('input', { type: 'string', demandOption: true, describe: 'Input JSON file with an array of store objects' })
  .option('mergeMap', { type: 'string', describe: 'Optional merge-map JSON file' })
  .option('out', { type: 'string', default: 'unified-stores-merged.json', describe: 'Output JSON file path' })
  .option('keywords', { type: 'boolean', default: false, describe: 'Use keywords-only merging' })
  .argv;

function normalizeText(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeForKey(s) {
  let t = normalizeText(s);
  if (!t) return '';
  const stopwords = ['local', 'sucursal', 'tienda', 'store', 'branch', 'oficina', 'centro'];
  const parts = t.split(' ').filter(p => !stopwords.includes(p));
  t = parts.join(' ');
  t = t.split(' ').map(w => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w)).join(' ');
  return t;
}

async function main() {
  const inPath = path.resolve(argv.input);
  const mergeMapPath = argv.mergeMap ? path.resolve(argv.mergeMap) : null;
  const outPath = path.resolve(argv.out);

  const raw = JSON.parse(await fs.readFile(inPath, 'utf8'));
  if (!Array.isArray(raw)) throw new Error('Input JSON must be an array');

  const MERGE_MAP = {};
  if (mergeMapPath) {
    try {
      const m = JSON.parse(await fs.readFile(mergeMapPath, 'utf8'));
      // allow both canonical->variants or variant->canonical, normalize keys
      Object.keys(m).forEach(k => {
        MERGE_MAP[normalizeForKey(k)] = m[k];
      });
    } catch (e) {
      console.warn('Failed to read mergeMap, continuing without it', e.message);
    }
  }

  const map = new Map();

  raw.forEach((item, idx) => {
    const rawObj = item || {};
    let candidate = rawObj.canonicalName || rawObj.name || (Array.isArray(rawObj.sourceNames) && rawObj.sourceNames[0]) || '';
    const normCandidate = normalizeForKey(candidate);
    if (normCandidate && MERGE_MAP[normCandidate]) candidate = MERGE_MAP[normCandidate];
    const addresses = Array.isArray(rawObj.addresses) ? rawObj.addresses.slice() : (rawObj.address ? [rawObj.address] : []);
    const firstAddr = addresses[0] || '';
    const keyBase = candidate ? normalizeForKey(candidate) : normalizeForKey(firstAddr) || ('id-' + (rawObj.id || idx));
    const key = keyBase || ('r-' + idx);

    if (map.has(key)) {
      const ex = map.get(key);
      // merge addresses
      const set = new Set([...(ex.addresses || []), ...addresses.filter(Boolean)]);
      ex.addresses = Array.from(set);
      ex.address = ex.addresses[0] || ex.address || '';
      ex.sourceNames = Array.from(new Set([...(ex.sourceNames || []), ...(Array.isArray(rawObj.sourceNames) ? rawObj.sourceNames : rawObj.sourceNames ? [rawObj.sourceNames] : [])]));
      ex.menuItems = Array.isArray(ex.menuItems) ? ex.menuItems.concat(Array.isArray(rawObj.menuItems) ? rawObj.menuItems : []) : (Array.isArray(rawObj.menuItems) ? rawObj.menuItems : []);
      ex.merged = true;
    } else {
      const name = rawObj.canonicalName || rawObj.name || (Array.isArray(rawObj.sourceNames) && rawObj.sourceNames[0]) || 'Sin nombre';
      const category = rawObj.category || rawObj.type || 'Restaurante';
      const menuItems = Array.isArray(rawObj.menuItems) ? rawObj.menuItems : [];
      const sourceNames = Array.isArray(rawObj.sourceNames) ? rawObj.sourceNames.slice() : rawObj.sourceNames ? [rawObj.sourceNames] : [];
      map.set(key, {
        id: rawObj.id || ('gen-' + idx),
        canonicalName: name,
        name,
        category,
        address: firstAddr || rawObj.address || '',
        addresses: addresses.length ? addresses : [],
        menuItems,
        sourceNames,
        merged: false,
        __raw: rawObj
      });
    }
  });

  const out = Array.from(map.values());
  await fs.writeFile(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log('Wrote', out.length, 'canonical stores to', outPath);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
