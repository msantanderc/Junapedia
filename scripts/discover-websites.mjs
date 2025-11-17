#!/usr/bin/env node
/*
  Discover official websites for franchise tokens that currently fall back to Google Search.
  Data sources:
    - Tokens from src/franchiseNames.js
    - Current WEBSITE_MAP from src/websiteMap.js
  Search backends (choose one via env):
    - Google Custom Search JSON API: GOOGLE_API_KEY + GOOGLE_CSE_ID
    - SerpAPI (https://serpapi.com/): SERPAPI_KEY

  Usage (PowerShell):
    $env:GOOGLE_API_KEY = "xxxxx"; $env:GOOGLE_CSE_ID = "xxxxx"; node scripts/discover-websites.mjs
  or
    $env:SERPAPI_KEY = "xxxxx"; node scripts/discover-websites.mjs
*/

import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import fs from 'node:fs/promises'

// Try to load simple key=value env files (.env.local or .env) into process.env
async function loadDotEnvFiles(root){
  const candidates = ['.env.local', '.env']
  for (const f of candidates){
    const p = path.resolve(root, f)
    try{
      const txt = await fs.readFile(p, 'utf8')
      txt.split(/\r?\n/).forEach(line => {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
        if (!m) return
        const key = m[1]
        let val = m[2] || ''
        // strip surrounding quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1,-1)
        }
        if (!process.env[key]) process.env[key] = val
      })
      console.log(`Loaded env from ${p}`)
      return
    }catch(e){ /* ignore missing file */ }
  }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

// Resolve modules from project root
const franchiseMapPath = path.resolve(root, 'src/franchiseNames.js')
const websiteMapPath = path.resolve(root, 'src/websiteMap.js')

async function loadModule(p) {
  const url = pathToFileURL(p).href
  const mod = await import(url)
  return mod
}

function normalize(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hostOf(u) {
  try { return new URL(u).hostname } catch { return '' }
}

function tokenLikeInHost(token, host) {
  const t = normalize(token).replace(/\s+/g, '')
  const h = host.replace(/^www\./, '')
  return h.includes(t)
}

// Keep aggregator / low-quality hosts banned, but allow social hosts as possible fallbacks
const BAN_HOSTS = ['tripadvisor','foursquare','wikipedia.org','yelp','rappi','ubereats','pedidosya','google.com','maps.google']

function isBannedHost(host){
  return BAN_HOSTS.some(b => host.includes(b))
}

function scoreResult(url, token, display){
  const host = hostOf(url)
  if (!host || isBannedHost(host)) return -Infinity
  const tld = host.split('.').pop() || ''
  const goodTLD = ['cl','com','net','lat','site','store','rest'].includes(tld) ? 1 : 0
  const tokenMatch = tokenLikeInHost(token, host) ? 2 : 0
  const displayMatch = tokenLikeInHost(display, host) ? 1 : 0
  const pathDepth = (()=>{ try { return (new URL(url).pathname || '/').split('/').filter(Boolean).length } catch { return 99 } })()
  const shortPath = pathDepth <= 1 ? 1 : 0
  const localTLD = tld === 'cl' ? 2 : 0
  return goodTLD + tokenMatch + displayMatch + shortPath + localTLD
}

async function searchGoogleCSE(query) {
  const key = process.env.GOOGLE_API_KEY
  const cx = process.env.GOOGLE_CSE_ID
  if (!key || !cx) return null
  const params = new URLSearchParams({ key, cx, q: query, num: '5', lr: 'lang_es' })
  const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`)
  if (!res.ok) throw new Error(`CSE HTTP ${res.status}`)
  const json = await res.json()
  const items = (json.items || []).map(i => ({ title: i.title, link: i.link, displayLink: i.displayLink }))
  return items
}

async function searchSerpAPI(query) {
  const key = process.env.SERPAPI_KEY
  if (!key) return null
  const params = new URLSearchParams({ engine: 'google', api_key: key, q: query, num: '5', hl: 'es', gl: 'cl' })
  const res = await fetch(`https://serpapi.com/search.json?${params}`)
  if (!res.ok) throw new Error(`SerpAPI HTTP ${res.status}`)
  const json = await res.json()
  const items = (json.organic_results || []).slice(0, 5).map(r => ({ title: r.title, link: r.link, displayLink: r.displayed_link }))
  return items
}

async function searchTop5(query) {
  const a = await searchGoogleCSE(query)
  if (a && a.length) return a
  const b = await searchSerpAPI(query)
  if (b && b.length) return b
  return []
}

async function main() {
  await loadDotEnvFiles(root)
  const { FRANCHISE_NAME_MAP } = await loadModule(franchiseMapPath)
  const { WEBSITE_MAP } = await loadModule(websiteMapPath)

  const tokens = Object.keys(FRANCHISE_NAME_MAP)
  const needs = tokens.filter(t => {
    const v = WEBSITE_MAP[t]
    return !v || /google\.com\/search/i.test(String(v))
  })

  const suggestions = []

  for (const t of needs) {
    const display = FRANCHISE_NAME_MAP[t]
    const q = `${display} Chile sitio oficial`
    let results = []
    try {
      results = await searchTop5(q)
    } catch (e) {
      console.error(`Search error for ${t}:`, e?.message || e)
      results = []
    }
    // Score results and choose the best non-banned domain
    const scored = results.map(r => ({ ...r, score: scoreResult(r.link, t, display) }))
    // Prefer positive score; else allow highest even if 0/-Inf filtered
    const sorted = scored
      .filter(r => r.score > -Infinity)
      .sort((a,b) => (b.score - a.score))
    const candidate = sorted.find(r => r.score >= 2) || sorted[0] || null
    const alt = results[0] || null
    suggestions.push({
      token: t,
      display,
      query: q,
      chosen: candidate ? candidate.link : null,
      fallback: alt ? alt.link : null,
      results: scored,
    })
    // brief log
    const picked = candidate ? `${candidate.link} (score ${candidate.score})` : '(no clear official)'
    console.log(`• ${display} [${t}] => ${picked}`)
  }

  const outPath = path.resolve(root, 'website-suggestions.json')
  await fs.writeFile(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), suggestions }, null, 2), 'utf8')
  console.log(`\nSaved suggestions -> ${outPath}`)
  console.log('Review and update src/websiteMap.js accordingly.')
}

main().catch(err => { console.error(err); process.exit(1) })
