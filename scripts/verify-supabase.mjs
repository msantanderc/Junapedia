#!/usr/bin/env node
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { createClient } from '@supabase/supabase-js';

const argv = yargs(hideBin(process.argv))
  .option('url', { type: 'string', describe: 'Supabase URL (env SUPABASE_URL ok)' })
  .option('serviceKey', { type: 'string', describe: 'Service role key (env SUPABASE_SERVICE_ROLE_KEY ok)' })
  .option('table', { type: 'string', default: 'pluxee_stores' })
  .argv;

async function main(){
  const SUPABASE_URL = argv.url || process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = argv.serviceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY){
    console.error('Provide SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY via args or env');
    process.exit(2);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const table = argv.table;

  try{
    const head = await supabase.from(table).select('*', { head: true, count: 'exact' });
    if(head.error){
      console.error('Count query error:', head.error);
    } else {
      console.log('Table:', table, '- Row count:', head.count);
    }

    const sample = await supabase.from(table).select('id, canonical_name, addresses, source_names, seeded_at, merged').order('seeded_at', { ascending: false }).limit(10);
    if(sample.error){
      console.error('Sample query error:', sample.error);
    } else {
      console.log('Sample rows (up to 10):');
      console.log(JSON.stringify(sample.data, null, 2));
    }
  }catch(err){
    console.error('Unexpected error:', err);
  }
}

main();
