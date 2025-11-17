#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'

function normalize(s=''){
  return String(s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hostOf(u){ try { return new URL(u).hostname } catch { return '' } }

const SOCIAL_HOSTS = ['facebook.com','instagram.com','x.com','twitter.com','tiktok.com','youtube.com']

function isSocialHost(host){
  return SOCIAL_HOSTS.some(h => host.includes(h))
}

async function main(){
  const root = process.cwd()
  const inPath = path.resolve(root, 'website-suggestions.json')
  const outPath = path.resolve(root, 'website-suggestions-social-picked.json')

  let raw
  try { raw = await fs.readFile(inPath, 'utf8') } catch (e) { console.error('Cannot read', inPath); process.exit(1) }
  const data = JSON.parse(raw)
  const suggestions = Array.isArray(data.suggestions) ? data.suggestions : []

  let picked = 0
  let socialCandidates = 0

  for (const s of suggestions){
    if (s.chosen) continue
    const token = s.token || ''
    const display = s.display || ''
    const nToken = normalize(token.replace(/[-_]/g, ' '))
    const nDisplay = normalize(display)

    for (const r of (s.results || [])){
      if (!r || !r.link) continue
      const host = hostOf(r.link)
      if (!host) continue
      if (!isSocialHost(host)) continue
      socialCandidates++

      const titleAndPath = [r.title || '', r.link || '', r.displayLink || ''].join(' ')
      const nText = normalize(titleAndPath)
      const pathPart = (()=>{ try { return new URL(r.link).pathname.replace(/\//g,' ') } catch { return '' } })()
      const nPath = normalize(pathPart)

      // match if token or display appears in title/path/link
      const matches = nText.includes(nToken) || nText.includes(nDisplay) || nPath.includes(nToken) || nPath.includes(nDisplay)
      if (matches){
        s.chosen = r.link
        s.chosenReason = 'social-match'
        s.chosenHost = host
        picked++
        console.log(`Picked social for ${s.token} -> ${r.link}`)
        break
      }
    }
  }

  const out = { generatedAt: new Date().toISOString(), picked, socialCandidates, suggestions }
  await fs.writeFile(outPath, JSON.stringify(out, null, 2), 'utf8')
  console.log(`Wrote ${outPath} — picked ${picked} out of ${suggestions.length} suggestions (social candidates: ${socialCandidates})`)
}

main().catch(e=>{ console.error(e); process.exit(1) })
