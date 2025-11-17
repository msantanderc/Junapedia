#!/usr/bin/env node
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

function normalizeText(s) {
  if (!s) return ''
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
}

function normalizeForKey(s) {
  let t = normalizeText(s)
  if (!t) return ''
  const stopwords = ['local', 'sucursal', 'tienda', 'store', 'branch', 'oficina', 'centro']
  const parts = t.split(' ').filter(p => !stopwords.includes(p))
  t = parts.join(' ')
  t = t.split(' ').map(w => {
    if (w.length > 3 && w.endsWith('s')) return w.slice(0, -1)
    return w
  }).join(' ')
  return t
}

function tokenNormForm(t) {
  return normalizeForKey(t.replace(/-/g, ' '))
}

async function main() {
  const franchisePath = path.resolve(root, 'src/franchiseNames.js')
  const storesPath = path.resolve(root, 'unified-stores-from-csv-noflags.json')
  const mod = await import(new URL('file://' + franchisePath).href)
  const FRANCHISE_NAME_MAP = mod.FRANCHISE_NAME_MAP || {}
  const tokens = Object.keys(FRANCHISE_NAME_MAP || {})

  const raw = JSON.parse(await fs.readFile(storesPath, 'utf8'))
  const map = new Map()

  for (const s of raw) {
    const name = s.name || s.canonicalName || (s.source_names && s.source_names[0]) || s['Merchant Name'] || ''
    const token = findFranchiseKeyLocal(name, tokens)
    const key = token || normalizeForKey(name) || s.id || ''
    if (!map.has(key)) map.set(key, [])
    map.get(key).push({ id: s.id, name, token })
  }

  const groups = []
  for (const [k, arr] of map.entries()) {
    groups.push({ key: k, count: arr.length, token: tokens.includes(k) ? k : null, sample: arr[0] })
  }
  groups.sort((a,b) => b.count - a.count)

  console.log('Top groups (by count):')
  groups.slice(0,200).forEach(g => {
    console.log(`${g.count}\tkey=${g.key}\ttoken=${g.token || '-'}\texample=${g.sample.name}`)
  })

  console.log('\nTokens with zero members:')
  const tokenSet = new Set(tokens)
  for (const g of groups) {
    if (g.token) tokenSet.delete(g.token)
  }
  Array.from(tokenSet).forEach(t => console.log(`- ${t} -> ${FRANCHISE_NAME_MAP[t]}`))
}

function findFranchiseKeyLocal(name, tokens) {
  const norm = normalizeForKey(name || '')
  const compact = norm.replace(/\s+/g, '')
  for (const t of tokens) {
    if (!t) continue
    const tokenNorm = tokenNormForm(t)
    if (norm === tokenNorm) return t
  }
  for (const t of tokens) {
    if (!t) continue
    const tokenNorm = tokenNormForm(t)
    const tokenCompact = tokenNorm.replace(/\s+/g, '')
    if (norm.includes(tokenNorm) || compact.includes(tokenCompact) || (name || '').toLowerCase().includes(t.replace(/-/g,' '))) return t
  }
  return null
}

main().catch(err => { console.error(err); process.exit(1) })
