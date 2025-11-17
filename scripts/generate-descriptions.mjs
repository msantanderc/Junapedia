#!/usr/bin/env node
/*
  Generate descriptive text for stores.

  - Uses local heuristics to create descriptions based on `menu_items`, `category`,
    and whether the store belongs to a known franchise (via `src/franchiseNames.js`).
  - Optional: if `OPENAI_API_KEY` is set in env, will call OpenAI Chat Completions to refine descriptions.

  Usage (PowerShell):
    node scripts/generate-descriptions.mjs
  With OpenAI:
    $env:OPENAI_API_KEY = "sk..."; node scripts/generate-descriptions.mjs

  Output: `generated-descriptions.json` at project root with { id, name, description }
*/

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

async function loadFranchises() {
  const mod = await import(new URL('file://' + path.resolve(root, 'src/franchiseNames.js')).href)
  return mod.FRANCHISE_NAME_MAP || {}
}

function computeHeuristic(store, franchiseMap) {
  const category = normalizeText(store.category || '')
  const isFranchise = !!findFranchiseKeyLocal(store.name || '', Object.keys(franchiseMap))

  // If menu items are available, list up to 4 representative items
  if (store.menu_items && Array.isArray(store.menu_items) && store.menu_items.length > 0) {
    const top = store.menu_items.slice(0, 4).map(mi => mi.name || mi).filter(Boolean)
    const list = top.join(', ')
    return `Ofrece ${store.menu_items.length} productos; destaca: ${list}. Ideal para comprar opciones rápidas y del menú local.`
  }

  if (/supermercad|minimarket|puntos verdes/.test(category)) {
    return 'Productos de 2 o menos Sellos — abarrotes, snacks, bebidas y básicos de despensa.'
  }

  if (/(restaurante|restaurantes|casino|casinos)/.test(category) && !isFranchise && !/patio/.test(category)) {
    return 'Diversos productos del Menú del Local — platos y preparaciones servidas en el local.'
  }

  if (isFranchise) {
    return `Parte de la franquicia (${findFranchiseKeyLocal(store.name||'', Object.keys(franchiseMap)) || 'franquicia conocida'}) — menú y productos típicos de la cadena.`
  }

  return 'menú especial especifico'
}

function findFranchiseKeyLocal(name, tokens) {
  const norm = normalizeForKey(name || '')
  const compact = norm.replace(/\s+/g, '')
  for (const t of tokens) {
    if (!t) continue
    const tokenNorm = normalizeForKey(t.replace(/-/g, ' '))
    if (norm === tokenNorm) return t
  }
  for (const t of tokens) {
    if (!t) continue
    const tokenNorm = normalizeForKey(t.replace(/-/g, ' '))
    const tokenCompact = tokenNorm.replace(/\s+/g, '')
    if (norm.includes(tokenNorm) || compact.includes(tokenCompact) || (name || '').toLowerCase().includes(t.replace(/-/g, ' '))) return t
  }
  return null
}

async function callOpenAI(prompt, apiKey, model = 'gpt-4o-mini') {
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY')
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: 'Eres un asistente que genera descripciones cortas (1-2 frases) y amigables de locales, en español.' }, { role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 120
    })
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`OpenAI error: ${res.status} ${txt}`)
  }
  const j = await res.json()
  const out = j.choices && j.choices[0] && (j.choices[0].message?.content || j.choices[0].text)
  return out ? out.trim() : null
}

async function main() {
  const franchiseMap = await loadFranchises()
  const storesPath = path.resolve(root, 'unified-stores-from-csv-noflags.json')
  const raw = JSON.parse(await fs.readFile(storesPath, 'utf8'))
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || null
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  const out = []
  console.log(`Processing ${raw.length} stores (using ${apiKey ? 'OpenAI' : 'heuristics only'})`)

  // Limit automatic OpenAI calls to avoid accidental large usage
  const useOpenAI = !!apiKey
  let openaiCalls = 0
  const OPENAI_CALL_LIMIT = 200

  for (const s of raw) {
    const name = s.name || s.canonicalName || (s.source_names && s.source_names[0]) || ''
    let desc = computeHeuristic(s, franchiseMap)
    if (useOpenAI && openaiCalls < OPENAI_CALL_LIMIT) {
      const prompt = `Genera una descripción en español, 1-2 frases, para este local. Nombre: "${name}"; Categoría: "${s.category || ''}"; Direcciones: "${(s.addresses||[]).slice(0,2).join(' / ')}"; Informacion adicional: ${s.menu_items && s.menu_items.length ? JSON.stringify(s.menu_items.slice(0,6)) : 'sin menu'}; Reglas: si la categoría es supermercado/minimarket/puntos verdes, prioriza "Productos de 2 o menos Sellos"; si restaurante/casino (no franquicia y no patio), usar "Diversos productos del Menú del Local"; si no aplicar "menú especial especifico". Responde solo la descripción.`
      try {
        const aiResp = await callOpenAI(prompt, apiKey, model)
        if (aiResp) {
          desc = aiResp
          openaiCalls++
        }
      } catch (e) {
        console.warn('OpenAI call failed, falling back to heuristic for', name, e.message)
      }
    }
    out.push({ id: s.id, name, description: desc })
  }

  const outPath = path.resolve(root, 'generated-descriptions.json')
  await fs.writeFile(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), count: out.length, items: out }, null, 2), 'utf8')
  console.log(`Wrote ${out.length} descriptions -> ${outPath}`)
}

main().catch(err => { console.error(err); process.exit(1) })
