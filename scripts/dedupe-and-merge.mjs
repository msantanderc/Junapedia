#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { createClient } from '@supabase/supabase-js';

const argv = yargs(hideBin(process.argv))
  .option('input', { type: 'string', default: './unified-stores-merged.json', describe: 'Input JSON file to dedupe' })
  .option('out', { type: 'string', default: './unified-stores-deduped.json', describe: 'Output deduped JSON' })
  .option('url', { type: 'string', describe: 'Supabase URL (env SUPABASE_URL ok)' })
  .option('serviceKey', { type: 'string', describe: 'Supabase service_role key (env SUPABASE_SERVICE_ROLE_KEY ok)' })
  .option('table', { type: 'string', default: 'pluxee_stores' })
  .argv;

function stripDiacritics(s){
  return s ? s.normalize('NFD').replace(/\p{Diacritic}/gu,'') : '';
}
function normalizeForKey(s){
  if(!s) return '';
  let t = stripDiacritics(String(s)).toLowerCase();
  t = t.replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  // crude singularization
  t = t.split(' ').map(w => (w.length > 3 && w.endsWith('s')) ? w.slice(0,-1) : w).join(' ');
  return t;
}
function compact(s){ return (s||'').replace(/\s+/g,'').toLowerCase(); }

async function main(){
  const inputPath = path.resolve(argv.input);
  const outPath = path.resolve(argv.out);
  const txt = await fs.readFile(inputPath,'utf8');
  const arr = JSON.parse(txt);
  if(!Array.isArray(arr)) throw new Error('Input must be an array');

  // Map key -> merged record
  const map = new Map();
  const keyToIds = new Map();

  for(const item of arr){
    const nameKey = normalizeForKey(item.canonicalName || item.canonical_name || item.name || '');
    const addr = (Array.isArray(item.addresses) && item.addresses[0]) || (item.addresses && typeof item.addresses === 'string' ? item.addresses : '') || '';
    const addrKey = normalizeForKey(addr).split(' ').slice(0,4).join(' '); // first words of address
    const baseKey = (nameKey || '') + '|' + (addrKey || '');
    const comp = compact(baseKey);

    // Try fallback keys to capture slight variations
    const keysToTry = [comp, nameKey ? compact(nameKey) : '', addrKey ? compact(addrKey) : ''].filter(Boolean);
    let foundKey = null;
    for(const k of keysToTry){ if(map.has(k)){ foundKey = k; break; } }
    const useKey = foundKey || comp;

    if(!map.has(useKey)){
      const id = item.id || (item.canonicalName ? `franchise-${(item.canonicalName||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')}` : Math.random().toString(36).slice(2,9));
      const canonical = item.canonicalName || item.canonical_name || item.name || null;
      map.set(useKey, {
        id,
        canonical_name: canonical || null,
        name: canonical || null,
        category: item.category || item.type || 'Restaurante',
        addresses: Array.isArray(item.addresses) ? Array.from(new Set(item.addresses)) : (item.addresses ? [item.addresses] : (item.address ? [item.address] : [])),
        source_names: Array.isArray(item.sourceNames) ? Array.from(new Set(item.sourceNames)) : (item.sourceNames ? [item.sourceNames] : (item.source_names ? item.source_names : [])),
        menu_items: item.menuItems || item.menu_items || [],
        merged: false,
        __derived_from: item.__derived_from ? Array.from(new Set(item.__derived_from)) : (item.id ? [item.id] : [])
      });
      keyToIds.set(useKey, new Set([item.id]));
    } else {
      const existing = map.get(useKey);
      // merge addresses
      const addrs = new Set(existing.addresses || []);
      (Array.isArray(item.addresses) ? item.addresses : (item.addresses ? [item.addresses] : (item.address ? [item.address] : []))).forEach(a => a && addrs.add(a));
      existing.addresses = Array.from(addrs);
      // merge source names
      const src = new Set(existing.source_names || []);
      (Array.isArray(item.sourceNames) ? item.sourceNames : (item.sourceNames ? [item.sourceNames] : (item.source_names ? item.source_names : []))).forEach(s => s && src.add(s));
      existing.source_names = Array.from(src);
      // merge derived ids
      const derived = new Set(existing.__derived_from || []);
      if(item.__derived_from) item.__derived_from.forEach(d => d && derived.add(d));
      if(item.id) derived.add(item.id);
      existing.__derived_from = Array.from(derived);
      // pick a canonical name if missing
      if(!existing.canonical_name && (item.canonicalName || item.canonical_name || item.name)) existing.canonical_name = item.canonicalName || item.canonical_name || item.name;
      keyToIds.get(useKey).add(item.id);
    }
  }

  const out = Array.from(map.values());
  await fs.writeFile(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log('Wrote deduped output to', outPath, 'with', out.length, 'entries -> reduced from', arr.length);

  // If Supabase creds provided and CONFIRM=1 then upsert
  const SUPABASE_URL = argv.url || process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = argv.serviceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY){
    if(process.env.CONFIRM !== '1'){
      console.log('\nDry-run: To actually upsert deduped data, set CONFIRM=1 and re-run this script with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set.');
      console.log('Sample out[0]:', JSON.stringify(out[0], null, 2));
      return;
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});
    const batchSize = 300;
    for(let i=0;i<out.length;i+=batchSize){
      const batch = out.slice(i, i+batchSize).map(item => ({
        id: item.id,
        canonical_name: item.canonical_name || item.name || null,
        source_names: item.source_names || [],
        addresses: item.addresses || [],
        category: item.category || 'Restaurante',
        menu_items: item.menu_items || [],
        merged: false,
        seeded_at: new Date().toISOString()
      }));
      const { error } = await supabase.from(argv.table).upsert(batch, { onConflict: ['id'] });
      if(error){ console.error('Upsert error:', error); process.exit(1); }
      console.log('Upserted batch', i, '->', i+batch.length-1);
    }
    console.log('Upsert complete');
  } else {
    console.log('\nNo Supabase creds provided or CONFIRM not set; skip DB upsert.');
  }
}

main().catch(err => { console.error('Error in dedupe-and-merge:', err); process.exit(1); });
