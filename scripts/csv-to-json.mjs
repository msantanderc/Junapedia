#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { parse } from 'csv-parse/sync';

const argv = yargs(hideBin(process.argv))
  .option('dir', { type: 'string', default: './csv', describe: 'Directory containing CSV files' })
  .option('out', { type: 'string', default: './raw-stores.json', describe: 'Output JSON file' })
  .argv;

async function readAllCsv(dir) {
  const absDir = path.resolve(dir);
  const files = await fs.readdir(absDir);
  const csvFiles = files.filter(f => f.toLowerCase().endsWith('.csv'));
  const rows = [];
  for (const f of csvFiles) {
    const txt = await fs.readFile(path.join(absDir, f), 'utf8');
    const recs = parse(txt, { columns: true, skip_empty_lines: true, relax: true });
    recs.forEach(r => rows.push({ __sourceFile: f, ...r }));
  }
  return rows;
}

function normalizeRecord(rec, idx) {
  // Try common column names
  const name = rec['Merchant Name'] || rec['name'] || rec['Nombre'] || rec['merchant'] || rec['Merchant'] || '';
  const address = rec['Address'] || rec['Dirección'] || rec['address'] || '';
  const city = rec['City'] || rec['Ciudad'] || rec['city'] || '';
  const category = rec['Category'] || rec['category'] || rec['Categoria'] || '';
  const fullAddress = [address, city].filter(Boolean).join(', ');
  return {
    id: rec.id || `csv-${idx}`,
    name: name || 'Sin nombre',
    canonicalName: name || 'Sin nombre',
    address: fullAddress,
    addresses: fullAddress ? [fullAddress] : [],
    category: category || 'Restaurante',
    sourceNames: name ? [name] : [],
    __raw: rec
  };
}

async function main() {
  const rows = await readAllCsv(argv.dir);
  if (!rows.length) {
    console.warn('No CSV rows found in', argv.dir);
  }
  const normalized = rows.map((r, i) => normalizeRecord(r, i));
  const outPath = path.resolve(argv.out);
  await fs.writeFile(outPath, JSON.stringify(normalized, null, 2), 'utf8');
  console.log('Wrote', normalized.length, 'records to', outPath);
}

main().catch(err => {
  console.error('CSV->JSON error:', err);
  process.exit(1);
});
