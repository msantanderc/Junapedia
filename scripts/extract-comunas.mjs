#!/usr/bin/env node
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

function normalizeText(s) {
  if (!s) return ''
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function titleCase(s){
  return s.split(' ').filter(Boolean).map(w => w[0]?.toUpperCase()+w.slice(1).toLowerCase()).join(' ')
}

async function main(){
  const src = path.resolve(root, 'unified-stores-from-csv-noflags.json')
  const outPath = path.resolve(root, 'src', 'knownComunas.json')
  const raw = JSON.parse(await fs.readFile(src, 'utf8'))
  const counts = new Map()

  for(const s of raw){
    const addrCandidates = []
    if (s.addresses && Array.isArray(s.addresses)) addrCandidates.push(...s.addresses)
    if (s.address) addrCandidates.push(s.address)
    if (s.source_names && Array.isArray(s.source_names)) addrCandidates.push(...s.source_names)
    const addr = (addrCandidates.find(Boolean) || '')
    if(!addr) continue
    // take substring after last comma as heuristic
    let comuna = ''
    const parts = String(addr).split(',')
    if(parts.length>1) comuna = parts[parts.length-1].trim()
    else {
      // fallback: last token after dash or last word
      const dashParts = String(addr).split('-')
      comuna = (dashParts[dashParts.length-1] || '').trim().split(' ').slice(-1)[0] || ''
    }
    comuna = normalizeText(comuna)
    if(!comuna) continue
    comuna = titleCase(comuna)
    counts.set(comuna, (counts.get(comuna)||0)+1)
  }

  const arr = Array.from(counts.entries()).map(([name,count]) => ({ name, count }))
  arr.sort((a,b)=>b.count - a.count || a.name.localeCompare(b.name))
  const names = arr.map(x=>x.name)
  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), counts: arr, names }, null, 2), 'utf8')
  console.log(`Wrote ${arr.length} comunas -> ${outPath}`)
}

main().catch(err=>{ console.error(err); process.exit(1) })
