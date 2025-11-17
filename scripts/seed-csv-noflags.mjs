#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import iconv from 'iconv-lite';

const argv = yargs(hideBin(process.argv))
  .option('dir', { type: 'string', default: './csv', describe: 'Directory with CSV files' })
  .option('table', { type: 'string', default: 'pluxee_stores' })
  .option('url', { type: 'string', describe: 'Supabase URL (or set SUPABASE_URL env)' })
  .option('serviceKey', { type: 'string', describe: 'Supabase service_role key (or set SUPABASE_SERVICE_ROLE_KEY env)' })
  .argv;

function normalizeForKey(s){
  if(!s) return '';
  const ns = String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  return ns.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function makeId(key){
  return 'csv-' + crypto.createHash('sha1').update(key).digest('hex').slice(0, 16);
}

async function readAllCsv(dir){
  let absDir = path.resolve(dir);
  try{
    const stat = await fs.stat(absDir);
    if(!stat.isDirectory()) throw new Error('Not a directory');
  }catch(err){
    const candidates = [];
    const lower = String(dir || '');
    const idx = lower.indexOf('node');
    if(idx > 0) candidates.push(path.resolve(dir.slice(0, idx)));
    candidates.push(path.resolve('./csv'));
    candidates.push(path.join(process.cwd(), 'csv'));
    let found = null;
    for(const cand of candidates){
      try{ const s = await fs.stat(cand); if(s.isDirectory()){ found = cand; break; } }catch(e){}
    }
    if(found) absDir = found;
    else {
      const cwdChildren = await fs.readdir(process.cwd());
      const e = new Error(`CSV directory not found: '${dir}'. Tried: ${[absDir, ...candidates].join(', ')}. Current folder entries: ${cwdChildren.join(', ')}`);
      e.code = 'ENOENT';
      throw e;
    }
  }
  const files = await fs.readdir(absDir);
  const csvFiles = files.filter(f => f.toLowerCase().endsWith('.csv'));
  const out = [];
  for(const f of csvFiles){
    const buf = await fs.readFile(path.join(absDir, f));
    // Try utf8; if it contains many replacement chars, fallback to win1252
    let txt = buf.toString('utf8');
    const replacementCount = (txt.match(/�/g) || []).length;
    // If any replacement char appears, prefer cp1252 decoding
    if(replacementCount > 0) {
      try {
        txt = iconv.decode(buf, 'win1252');
      } catch(e) {
        // fallback to latin1 if win1252 fails
        txt = iconv.decode(buf, 'latin1');
      }
    }
    const recs = parse(txt, { columns: true, skip_empty_lines: true, relax: true });
    recs.forEach((r,i) => out.push({ rec: r, file: f, idx: i }));
  }
  return out;
}

function extractFields(rec, sourceFile, idx){
  const name = rec['Merchant Name'] || rec['Merchant'] || rec['name'] || rec['Nombre'] || rec['merchant'] || '';
  const address = rec['Address'] || rec['Dirección'] || rec['address'] || rec['Direccion'] || '';
  const city = rec['City'] || rec['Ciudad'] || rec['city'] || '';
  const category = rec['Category'] || rec['category'] || rec['Categoria'] || '';
  const idRaw = rec['id'] || rec['ID'] || rec['Id'] || '';
  const id = idRaw ? String(idRaw) : `csv-${sourceFile}-${idx}`;
  const fullAddress = [address, city].filter(Boolean).join(', ');
  return { id, name: String(name||''), fullAddress: String(fullAddress||''), category: category||'Restaurante' };
}

async function main(){
  const rows = await readAllCsv(argv.dir);
  if(rows.length === 0){ console.error('No CSV rows found in', argv.dir); process.exit(1); }

  const map = new Map();
  for(const r of rows){
    const { id, name, fullAddress, category } = extractFields(r.rec, r.file, r.idx);
    const nName = normalizeForKey(name);
    const addrSnippet = normalizeForKey(fullAddress).slice(0, 80);
    const key = `${nName}||${addrSnippet}`;
    const existing = map.get(key);
    if(existing){
      if(name) existing.source_names.add(name.trim());
      if(fullAddress) existing.addresses.add(fullAddress.trim());
    }else{
      const sid = makeId(key);
      const source_names = new Set(); if(name) source_names.add(name.trim());
      const addresses = new Set(); if(fullAddress) addresses.add(fullAddress.trim());
      map.set(key, { id: sid, source_names, addresses, category });
    }
  }

  const prepared = Array.from(map.values()).map(it => ({
    id: it.id,
    source_names: Array.from(it.source_names).slice(0,10),
    addresses: Array.from(it.addresses).slice(0,10),
    category: it.category || 'Restaurante',
    menu_items: [],
    seeded_at: new Date().toISOString()
  }));

  console.log('Read', rows.length, 'rows from CSV files. Deduplicated to', prepared.length, 'records. Sample:');
  console.log(JSON.stringify(prepared.slice(0,5), null, 2));

  const outPath = path.resolve('./unified-stores-from-csv-noflags.json');
  await fs.writeFile(outPath, JSON.stringify(prepared, null, 2), 'utf8');
  console.log('Wrote preview to', outPath);

  const SUPABASE_URL = argv.url || process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = argv.serviceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY){
    console.log('\nDry-run: to upsert to Supabase set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and CONFIRM=1 in env.');
    return;
  }

  if(process.env.CONFIRM !== '1'){
    console.log('\nDry-run: set CONFIRM=1 to actually perform upserts.');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const batchSize = 300;
  for(let i=0;i<prepared.length;i+=batchSize){
    const batch = prepared.slice(i, i+batchSize);
    const { error } = await supabase.from(argv.table).upsert(batch, { onConflict: ['id'] });
    if(error){ console.error('Upsert error:', error); process.exit(1); }
    console.log(`Upserted batch ${i}..${i+batch.length-1}`);
  }
  console.log('CSV seed (no flags) complete.');
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
