import React, { useState, useEffect } from 'react';
import { FRANCHISE_NAME_MAP } from './src/franchiseNames.js';
import allowedComunas from './src/allowedComunas.json';
import { Search, MapPin, DollarSign, Store as StoreIcon, X, Globe } from 'lucide-react';
import { WEBSITE_MAP } from './src/websiteMap.js';
import { LOGO_MAP } from './src/logoMap.js';
import { Button } from './components/ui/button';
import Filters from './components/v0/Filters';
import StoreGrid from '@/components/store-grid';
import StoreCard from '@/components/store-card';
// Firebase/Firestore removed — app is Supabase-only now

type MenuItem = {
  name: string;
  description?: string;
  price?: string;
};

type Store = {
  id: string;
  name: string;
  category: string;
  address: string;
  menuItems?: MenuItem[];
};

type CanonicalStore = Store & {
  addresses?: string[];
  merged?: boolean;
  sourceNames?: string[];
  __raw?: any;
};

// Build a Google Maps search URL for a given address
function buildGoogleMapsUrl(address: string): string {
  if (!address) return 'https://www.google.com/maps';
  const q = encodeURIComponent(address);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function openInGoogleMaps(address: string) {
  if (!address) return;
  const url = buildGoogleMapsUrl(address);
  window.open(url, '_blank', 'noopener,noreferrer');
}

function buildWebsiteUrl(name: string, token?: string | null) {
  const t = token || (name ? normalizeForKey(name) : '');
  const mapped = (t && WEBSITE_MAP && WEBSITE_MAP[t]) ? WEBSITE_MAP[t] : null;
  if (mapped) return mapped;
  const q = encodeURIComponent(`${name} sitio web`);
  return `https://www.google.com/search?q=${q}`;
}

function openWebsite(name: string, token?: string | null) {
  const url = buildWebsiteUrl(name, token);
  window.open(url, '_blank', 'noopener,noreferrer');
}
function extractDomain(u: string): string | null {
  try {
    const url = new URL(u);
    return url.hostname;
  } catch {
    return null;
  }
}

function slugifyCategory(raw?: string): string | null {
  if (!raw) return null;
  try {
    const lower = String(raw).trim().toLowerCase();
    const noDia = lower.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const hyph = noDia.replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    return hyph; // e.g., "Comida Rápida" -> "comida-rapida"
  } catch {
    return String(raw).trim().toLowerCase().replace(/\s+/g, '-');
  }
}

const CATEGORY_LOGO_MAP: Record<string, string> = {
  'restaurante': '/logos/restaurantes.svg',
  'restaurantes': '/logos/restaurantes.svg',
  'casinos': '/logos/casinos.svg',
  'minimarket': '/logos/minimarket.svg',
  'patio de comida': '/logos/patio-de-comida.svg',
  'puntos verdes': '/logos/puntos-verdes.svg',
  'puntos azules': '/logos/puntos-azules.svg',
  'supermercado': '/logos/supermercado.svg',
  'supermercados': '/logos/supermercado.svg'
};

function buildLogoCandidates(name: string, category?: string): string[] {
  const token = findFranchiseKey(name || '', []);
  const cands: string[] = [];
  if (token) {
    const mapped = WEBSITE_MAP[token] || '';
    if (mapped && !/google\.com\/search/i.test(mapped)) {
      const host = extractDomain(mapped);
      if (host) {
        cands.push(`https://www.google.com/s2/favicons?sz=128&domain=${host}`);
        cands.push(`https://icons.duckduckgo.com/ip3/${host}.ico`);
        cands.push(`https://${host}/favicon.ico`);
      }
    }
    const logoFromMap = LOGO_MAP[token];
    if (logoFromMap) cands.push(logoFromMap);
    // also try /public/logos/<token> with common extensions
    cands.push(`/logos/${token}.svg`, `/logos/${token}.png`, `/logos/${token}.jpg`, `/logos/${token}.jpeg`, `/logos/${token}.webp`);
  }
  if (category) {
    const key = String(category).trim().toLowerCase();
    const mapped = CATEGORY_LOGO_MAP[key];
    if (mapped) cands.push(mapped);
  }
  // Always include a generic placeholder as last resort
  cands.push('/logo.svg', '/logo.png');
  // Deduplicate and URI-encode candidate paths so filenames with spaces work correctly
  const uniq = Array.from(new Set(cands));
  const base = (import.meta && (import.meta as any).env && (import.meta as any).env.BASE_URL) ? (import.meta as any).env.BASE_URL : '/';
  return uniq.map(p => {
    const clean = encodeURI(p);
    // If path is absolute (starts with /), prefix with Vite's BASE_URL so paths work on GitHub Pages
    if (clean.startsWith('/')) {
      return `${base.replace(/\/?$/, '/')}${clean.replace(/^\//, '')}`;
    }
    return clean;
  });
}

// Logo background removed as requested

// Normalize text for grouping keys: strip diacritics, punctuation, collapse whitespace, lowercase
function normalizeText(s?: string): string {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Normalize a string into a canonical key for grouping: strip diacritics/punct, remove common stopwords,
// collapse whitespace, and singularize simple plurals (trailing 's'). This is conservative but effective for grouping brand variants.
function normalizeForKey(s?: string): string {
  let t = normalizeText(s);
  if (!t) return '';
  const stopwords = ['local', 'sucursal', 'tienda', 'store', 'branch', 'oficina', 'centro'];
  const parts = t.split(' ').filter(p => !stopwords.includes(p));
  t = parts.join(' ');
  t = t.split(' ').map(w => {
    if (w.length > 3 && w.endsWith('s')) return w.slice(0, -1);
    return w;
  }).join(' ');
  return t;
}

// Attempt to find a franchise display name by matching known franchise tokens
// against a store name or the group's member names. This helps detect cases
// like "KFC INTERMODAL LA CISTERNA" and map them to the token "KFC".
function findFranchiseDisplay(name: string, members: any[] = []): string {
  if (!name && (!members || members.length === 0)) return '';
  const tokens = Object.keys(FRANCHISE_NAME_MAP || {});
  const norm = normalizeForKey(name || '');
  const compact = norm.replace(/\s+/g, '');
  for (const t of tokens) {
    if (!t) continue;
    // normalize token (tokens often use hyphens); compare against normalized name
    const tokenNorm = normalizeForKey(t.replace(/-/g, ' '));
    const tokenCompact = tokenNorm.replace(/\s+/g, '');
    if (norm === tokenNorm || norm.includes(tokenNorm) || compact.includes(tokenCompact) || (name || '').toLowerCase().includes(t.replace(/-/g, ' '))) {
      return FRANCHISE_NAME_MAP[t];
    }
  }
  // Check member names as a fallback
  for (const m of members) {
    const mn = normalizeForKey(m && (m.name || m.canonical_name || ''));
    const mcompact = mn.replace(/\s+/g, '');
    for (const t of tokens) {
      if (!t) continue;
      if (mn === t || mn.includes(t) || mcompact.includes(t) || (m.name || '').toLowerCase().includes(t)) {
        return FRANCHISE_NAME_MAP[t];
      }
    }
  }
  return '';
}

// Return the franchise map key (token) that best matches the name or members.
function findFranchiseKey(name: string, members: any[] = []): string | null {
  let tokens = Object.keys(FRANCHISE_NAME_MAP || {});
  if (!tokens || tokens.length === 0) return null;
  tokens = tokens.filter(t => t && t.length >= 3).sort((a,b) => b.length - a.length);
  const norm = normalizeForKey(name || '');
  const compact = norm.replace(/\s+/g, '');
  for (const t of tokens) {
    const tokenNorm = normalizeForKey(t.replace(/-/g, ' '));
    if (norm === tokenNorm) return t;
  }
  for (const t of tokens) {
    const tokenNorm = normalizeForKey(t.replace(/-/g, ' '));
    const tokenCompact = tokenNorm.replace(/\s+/g, '');
    if (norm.includes(tokenNorm) || compact.includes(tokenCompact) || (name || '').toLowerCase().includes(t.replace(/-/g, ' '))) return t;
  }
  for (const m of members || []) {
    const mn = normalizeForKey(m && (m.name || m.canonical_name || ''));
    const mcompact = mn.replace(/\s+/g, '');
    for (const t of tokens) {
      const tokenNorm = normalizeForKey(t.replace(/-/g, ' '));
      const tokenCompact = tokenNorm.replace(/\s+/g, '');
      if (mn === tokenNorm || mn.includes(tokenNorm) || mcompact.includes(tokenCompact) || (m.name || '').toLowerCase().includes(t.replace(/-/g, ' '))) {
        return t;
      }
    }
  }
  return null;
}

// Compute the purchase hint / description for a store according to category and franchise status
function computeStoreDescription(store: any): string {
  const cat = normalizeText(store.category || '');
  const isFranchise = !!findFranchiseKey(store.name || '', []);
  if (/supermercad|minimarket|puntos verdes/.test(cat)) {
    return 'Productos de 2 o menos Sellos';
  }
  if (/(restaurante|restaurantes|casino|casinos)/.test(cat) && !isFranchise && !/patio/.test(cat)) {
    return 'Diversos productos del Menú del Local';
  }
  return 'menú especial especifico';
}

// rawDocs: Array<{id: string, data: any}>
function unifyFirestoreDocs(rawDocs: Array<{ id: string; data: any }>): CanonicalStore[] {
  // Merge map: map common variants to a canonical display name.
  // Add entries here to force certain variants into the same canonical bucket.
  // Keys must be normalized (lowercase, stripped) — we use normalizeText when matching.
  const MERGE_MAP: Record<string, string> = {
    // examples: map plural/singular or misspellings
    'achoclonado': 'Achoclonado',
    'achoclonados': 'Achoclonado',
    // add more mappings as needed
  };

  const map = new Map<string, CanonicalStore>();
  rawDocs.forEach((rd) => {
    const raw = rd.data || {};
    let canonicalFromRaw = raw.canonicalName || raw.name || (Array.isArray(raw.sourceNames) && raw.sourceNames[0]) || '';
    // Apply MERGE_MAP when a normalized form matches
    const normCandidate = normalizeForKey(canonicalFromRaw);
    if (normCandidate && MERGE_MAP[normCandidate]) {
      canonicalFromRaw = MERGE_MAP[normCandidate];
    }
    const addresses = Array.isArray(raw.addresses) ? raw.addresses.slice() : (raw.address ? [raw.address] : []);
    const firstAddr = addresses[0] || '';
    const keyBase = canonicalFromRaw ? normalizeForKey(canonicalFromRaw) : normalizeForKey(firstAddr);
    const key = keyBase || rd.id;

    const existing = map.get(key);
    if (existing) {
      // merge addresses
      const addrSet = new Set([...(existing.addresses || []), ...addresses.filter(a => a)]);
      existing.addresses = Array.from(addrSet);
      existing.address = existing.addresses[0] || '';
      // merge sourceNames
      const srcs = new Set([...(existing.sourceNames || []), ...(Array.isArray(raw.sourceNames) ? raw.sourceNames : raw.sourceNames ? [raw.sourceNames] : [])]);
      existing.sourceNames = Array.from(srcs);
      // merged flag
      existing.merged = !!existing.merged || !!raw.merged;
      // category fallback
      if (!existing.category || existing.category === 'Restaurante') {
        existing.category = raw.category || existing.category;
      }
      // don't overwrite display name if we already have a canonical, but prefer raw.canonicalName
      if (raw.canonicalName && normalizeText(raw.canonicalName) !== normalizeText(existing.name)) {
        existing.name = raw.canonicalName;
      }
    } else {
      const name = raw.canonicalName || raw.name || (Array.isArray(raw.sourceNames) && raw.sourceNames[0]) || 'Sin nombre';
      const category = raw.category || raw.type || 'Restaurante';
      const menuItems = Array.isArray(raw.menuItems) ? raw.menuItems : [];
      const sourceNames = Array.isArray(raw.sourceNames) ? raw.sourceNames.slice() : raw.sourceNames ? [raw.sourceNames] : [];
      const cs: CanonicalStore = {
        id: rd.id,
        name,
        category,
        address: firstAddr || '',
        menuItems,
        addresses: addresses.length > 0 ? addresses : (name ? [''] : []),
        merged: !!raw.merged,
        sourceNames,
        __raw: raw
      };
      map.set(key, cs);
    }
  });
  return Array.from(map.values());
}

type NewStore = Omit<Store, 'id'>;

type PluxeeGuideProps = { hideHeader?: boolean; searchTerm?: string; onSearchTermChange?: (v: string) => void }

const PluxeeGuide = ({ hideHeader = false, searchTerm: controlledSearch, onSearchTermChange }: PluxeeGuideProps) => {
  console.log('PluxeeGuide: component render start');
  const [stores, setStores] = useState<CanonicalStore[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedComuna, setSelectedComuna] = useState<string>('all');
  const [selectedStore, setSelectedStore] = useState<CanonicalStore | null>(null);
  const [activeTab, setActiveTab] = useState<'restaurants' | 'supermarkets'>('restaurants');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  // Firestore access state removed; app uses Supabase-only
  const prevIdsRef = React.useRef<string[]>([]);

  const categories = ['all', 'Comida Rápida', 'Restaurante', 'Cafetería', 'Panadería', 'Supermercado'];

  // Provide comunas list for the Filters UI.
  // Use the user-provided whitelist so options appear even if no stores are present.
  const comunas = React.useMemo(() => {
    const allowed = Array.isArray(allowedComunas) ? allowedComunas.slice() : []
    return allowed.sort((a, b) => String(a).localeCompare(String(b)))
  }, [stores])

  useEffect(() => {
    console.log('PluxeeGuide: useEffect mount -> calling loadStores');
    loadStores();
    console.log('PluxeeGuide: useEffect after loadStores call');
  }, []);

  // initialStores removed — data is now sourced from Supabase.

  const loadStores = async (): Promise<void> => {
    setLoading(true);
    setErrorMessage('');
    try {
      try {
        const fb = await import('./src/supabase');
        const rows = await fb.fetchStoresFromSupabase();
        if (Array.isArray(rows)) {
          const canonical = rows.map((p: any) => ({
            id: p.id || p.canonical_name || Math.random().toString(36).slice(2,9),
            name: p.canonical_name || p.name || (Array.isArray(p.source_names) && p.source_names[0]) || 'Sin nombre',
            category: p.category || 'Restaurante',
            address: (Array.isArray(p.addresses) && p.addresses[0]) || '',
            addresses: Array.isArray(p.addresses) ? p.addresses : [],
            menuItems: p.menu_items || [],
            merged: !!p.merged,
            __raw: p
          }));
          setStores(canonical as CanonicalStore[]);
          prevIdsRef.current = canonical.map((c: any) => c.id);
          setLoading(false);
          return;
        } else {
          setErrorMessage('La respuesta de Supabase no contenía datos.');
        }
      } catch (err: any) {
        console.error('Error fetching from Supabase:', err);
        setStores([]);
        prevIdsRef.current = [];
        if (String(err?.message || '').includes('not initialized')) {
          setErrorMessage('Supabase no está configurado. Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.');
        } else {
          setErrorMessage('No se pudo obtener datos de Supabase.');
        }
        setLoading(false);
        return;
      }
    } catch (error: any) {
      console.error('Error loading stores:', error);
      setStores([]);
      if (!errorMessage) setErrorMessage('Error inesperado al cargar locales.');
    } finally {
      setLoading(false);
    }
  };
  // Removed client update/check features by request

  const filteredStores = (() => {
    const effectiveSearch = controlledSearch ?? searchTerm;
    const q = normalizeText(effectiveSearch || '');
    return stores.filter((store: CanonicalStore) => {
      const nameNorm = normalizeText(store.name);
      const addressesNorm = (store.addresses || []).map(a => normalizeText(a)).join(' ');
      const matchesSearch = q === '' || nameNorm.includes(q) || addressesNorm.includes(q);
      const catNorm = normalizeText(store.category || '');
      const selNorm = normalizeText(selectedCategory);
      const matchesCategory = selectedCategory === 'all' || catNorm === selNorm;
      const comunaNorm = normalizeText(selectedComuna || '');
      const matchesComuna = selectedComuna === 'all' || addressesNorm.includes(comunaNorm);
      const matchesTab = activeTab === 'restaurants'
        ? catNorm !== 'supermercados'
        : catNorm === 'supermercados';
      return matchesSearch && matchesCategory && matchesTab && matchesComuna;
    });
  })();

  // Group filtered stores by a normalized key so brand clusters render as a single card.
  const [selectedGroup, setSelectedGroup] = useState(null as any);
  const groupedDisplay = (() => {
    const map = new Map<string, CanonicalStore[]>();
    filteredStores.forEach(s => {
      // Try to group by canonical franchise token when possible so mapped names don't break grouping
      const token = findFranchiseKey(s.name || '', []);
      const key = token || normalizeForKey(s.name || s.id) || s.id;
      const arr = map.get(key) || [];
      arr.push(s);
      map.set(key, arr);
    });
    const out: Array<any> = [];
    for (const [k, arr] of map.entries()) {
      const addrSet = new Set<string>();
      arr.forEach(a => (a.addresses || [a.address || '']).forEach(ad => { if (ad) addrSet.add(ad); }));
      // prefer a canonical franchise name from the generated map if available
      // if the grouping key is a known franchise token, prefer its canonical name
      const tokenKey = k;
      const direct = FRANCHISE_NAME_MAP[tokenKey] || null;
      const fuzzy = findFranchiseDisplay(arr[0] && (arr[0].name || ''), arr);
      const displayName = direct || fuzzy || (arr[0] && arr[0].name) || '';
      if (arr.length > 1) {
        out.push({ type: 'group', key: k, name: displayName, count: arr.length, members: arr, addresses: Array.from(addrSet) });
      } else {
        out.push({ type: 'single', store: arr[0], name: displayName });
      }
    }
    return out;
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Cargando...</div>
      </div>
    );
  }
  // small debug banner inside the main component to confirm it rendered
  console.log('PluxeeGuide: rendering main UI, loading=false, stores length=', stores.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {!hideHeader && (
        <div className="bg-gradient-to-r from-pluxee-700 to-pluxee-500 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                {/* Render the project logo instead of text header */}
                <img
                  src={`${import.meta.env.BASE_URL || '/'}logo.png`}
                  alt="Junapedia"
                  className="h-10 md:h-12 lg:h-14 w-auto object-contain"
                />
              </div>
              <div />
            </div>
          </div>
        </div>
      )}

      {/* Firestore-specific warning removed — app operates Supabase-only */}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => {
                setActiveTab('restaurants');
                setSelectedCategory('all');
              }}
              className={`flex-1 px-6 py-4 font-semibold text-lg transition ${
                activeTab === 'restaurants'
                  ? 'bg-pluxee-700 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              🍽️ Restaurantes & Locales
            </button>
            <button
              onClick={() => {
                setActiveTab('supermarkets');
                setSelectedCategory('all');
              }}
              className={`flex-1 px-6 py-4 font-semibold text-lg transition ${
                activeTab === 'supermarkets'
                  ? 'bg-pluxee-700 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              🛒 Supermercados
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          <aside className="md:col-span-1">
                <Filters
                  activeTab={activeTab}
                  selectedCategory={selectedCategory}
                  onCategoryChange={(cat) => setSelectedCategory(cat)}
                  communes={comunas}
                  selectedComuna={selectedComuna}
                  onComunaChange={(c) => setSelectedComuna(c)}
                />
          </aside>
          <div className="md:col-span-3">
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <div className="flex flex-col gap-4">
                {typeof onSearchTermChange !== 'function' && (
                  <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o ubicación..."
                      value={controlledSearch ?? searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pluxee-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Mensaje de error global */}
            {errorMessage && (
              <div className="mb-6 p-4 border border-red-200 bg-red-50 text-red-700 rounded-lg text-sm">
                {errorMessage}
              </div>
            )}

            {/* Singles rendered via v0 StoreGrid */}
            {(() => {
              const singles = groupedDisplay.filter((g: any) => g.type === 'single').map((g: any) => g.store);
              const storesForGrid = singles.map((s: any) => ({
                id: s.id,
                name: s.name,
                category: s.category,
                address: s.address,
                image: undefined,
                logoCandidates: buildLogoCandidates(s.name, s.category),
                hours: '',
                description: computeStoreDescription(s)
              }));
              return (
                <StoreGrid
                  stores={storesForGrid}
                  searchQuery={controlledSearch ?? searchTerm}
                  selectedCategory={selectedCategory}
                  onOpenStore={(s) => {
                    const found = singles.find((x: any) => x.id === s.id);
                    if (found) setSelectedStore(found);
                  }}
                  onVisit={(s) => {
                    const token = findFranchiseKey(s.name || '', []);
                    openWebsite(s.name, token);
                  }}
                  onOpenMaps={(s) => {
                    if (s.address) openInGoogleMaps(s.address);
                  }}
                />
              );
            })()}

            {/* Franchises rendered using v0 StoreCard styling (use same column sizes as singles) */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 mt-6">
              {groupedDisplay.filter((g: any) => g.type === 'group').map((grp: any) => {
                const firstAddress = (grp.addresses && grp.addresses[0]) || '';
                const token = grp.key;
                // determine dominant category from members (fallback to 'Restaurante')
                const catCount: Record<string, number> = {};
                (grp.members || []).forEach((m: any) => {
                  const c = (m.category || 'Restaurante');
                  catCount[c] = (catCount[c] || 0) + 1;
                });
                const dominantCategory = Object.keys(catCount).sort((a,b) => (catCount[b]||0) - (catCount[a]||0))[0] || 'Restaurante';
                return (
                  <StoreCard
                    key={`group-${grp.key}`}
                    id={`group-${grp.key}`}
                    name={grp.name}
                    category={dominantCategory}
                    floor={firstAddress}
                    logoCandidates={buildLogoCandidates(grp.name, dominantCategory)}
                    description={`${grp.count} locales`}
                    onClick={() => setSelectedGroup(grp)}
                    onVisit={() => openWebsite(grp.name, token)}
                    onOpenMaps={() => firstAddress && openInGoogleMaps(firstAddress)}
                  />
                );
              })}
            </div>

            {filteredStores.length === 0 && (
              <div className="text-center py-12">
                <StoreIcon size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 text-lg">
                  No se encontraron {activeTab === 'restaurants' ? 'restaurantes' : 'supermercados'}
                </p>
                
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedStore && (
        <StoreDetailModal
          store={selectedStore}
          onClose={() => setSelectedStore(null)}
        />
      )}
      {selectedGroup && (
        <GroupDetailModal
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
          onOpenStore={(s) => { setSelectedStore(s); setSelectedGroup(null); }}
        />
      )}
    </div>
  );
};


const HeaderLogo = () => {
  const [candidates] = useState<string[]>(['/logo.svg', '/logo.png', '/logo.jpg']);
  const [idx, setIdx] = useState<number>(0);
  const [hidden, setHidden] = useState<boolean>(false);
  if (hidden) return null;
  const src = candidates[idx];
  return (
    <img
      src={src}
      alt="Junapedia"
      className="h-10 w-auto rounded-sm bg-white/0"
      onError={() => {
        if (idx < candidates.length - 1) setIdx(idx + 1);
        else setHidden(true);
      }}
    />
  );
};



const StoreDetailModal = ({ store, onClose }) => {
  const tokenForStore = findFranchiseKey(store.name || '', []);
  const isFranchiseStore = !!tokenForStore;
  const catNorm = normalizeText(store.category || '');
  let purchaseHint = '';
  if (/supermercad|minimarket|puntos verdes|minimarket/.test(catNorm)) {
    purchaseHint = 'Productos de 2 o menos Sellos';
  } else if (/(restaurante|restaurantes|casino|casinos)/.test(catNorm) && !isFranchiseStore && !/patio/.test(catNorm)) {
    purchaseHint = 'Diversos productos del Menú del Local';
  }
  // Fallback for categories not covered above
  if (!purchaseHint) {
    purchaseHint = 'menú especial especifico';
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-pluxee-600 to-pluxee-400 text-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{store.name}</h2>
              <span className="text-sm bg-white/20 px-3 py-1 rounded-full inline-block mt-2">
                {store.category}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openWebsite(store.name, findFranchiseKey(store.name || '', []))}
                className="text-white hover:bg-white/20 p-2 rounded-lg"
                title="Abrir sitio web"
              >
                <Globe size={22} />
              </button>
              <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-start gap-2 text-gray-700 mb-2">
              <MapPin size={20} className="mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold">Ubicaciones</p>
                {store.addresses && store.addresses.length > 0 ? (
                  <div className="space-y-2">
                    {store.addresses.map((a, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        onClick={() => openInGoogleMaps(a)}
                        className="w-full justify-start"
                        title="Abrir en Google Maps"
                      >
                        📍 {a}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div>
                    {store.address ? (
                      <Button
                        variant="outline"
                        onClick={() => openInGoogleMaps(store.address)}
                        className="w-full justify-start"
                        title="Abrir en Google Maps"
                      >
                        📍 {store.address}
                      </Button>
                    ) : (
                      <p className="text-gray-600">Dirección no disponible</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          {purchaseHint && (
            <div className="mb-6 p-4 bg-pluxee-50 border border-pluxee-100 rounded-lg text-sm text-gray-800">
              <div className="font-semibold">¿Qué puedes comprar?</div>
              <div className="mt-1">{purchaseHint}</div>
            </div>
          )}
          {store.menuItems && store.menuItems.length > 0 && (
            <div>
              <h3 className="text-xl font-bold mb-4 text-gray-800">Menú / Productos</h3>
              <div className="space-y-3">
                {store.menuItems.map((item, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-4 flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-800">{item.name}</p>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      )}
                    </div>
                    <span className="text-blue-600 font-bold ml-4">${item.price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const GroupDetailModal = ({ group, onClose, onOpenStore }) => {
  const [selectedAddress, setSelectedAddress] = useState((group.addresses && group.addresses[0]) || '');
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-pluxee-600 to-pluxee-400 text-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{group.name} — Franquicia ({group.count})</h2>
              <span className="text-sm bg-white/20 px-3 py-1 rounded-full inline-block mt-2">Franquicia consolidada</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openWebsite(group.name, group.key)}
                className="text-white hover:bg-white/20 p-2 rounded-lg"
                title="Abrir sitio web de la franquicia"
              >
                <Globe size={22} />
              </button>
              <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <h3 className="font-semibold">Direcciones agregadas</h3>
            {group.addresses && group.addresses.length > 0 ? (
              <div className="mt-2 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <select
                  className="flex-1 px-3 py-2 border rounded-lg"
                  value={selectedAddress}
                  onChange={(e) => setSelectedAddress(e.target.value)}
                >
                  {group.addresses.map((a: string, i: number) => (
                    <option key={i} value={a}>{a}</option>
                  ))}
                </select>
                <button
                  onClick={() => openInGoogleMaps(selectedAddress)}
                  disabled={!selectedAddress}
                  className={`px-4 py-2 rounded-lg font-semibold ${selectedAddress ? 'bg-pluxee-700 text-white hover:bg-pluxee-600' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                >
                  Abrir en Google Maps
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-600 mt-2">Sin direcciones disponibles</p>
            )}
          </div>

          <div>
            <h3 className="font-semibold">Locales de la franquicia</h3>
            <div className="space-y-3 mt-3">
              {group.members.map(m => (
                <div key={m.id} className="p-3 border rounded hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{m.name}</div>
                      <div className="text-sm text-gray-600">{(m.addresses && m.addresses[0]) || m.address}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => onOpenStore(m)} className="text-pluxee-700 underline">Abrir</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openWebsite(m.name, findFranchiseKey(m.name || '', [])); }}
                        className="text-pluxee-700 underline inline-flex items-center gap-1"
                        title="Abrir sitio web"
                      >
                        <Globe size={16} />
                        <span>Sitio web</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};



export default PluxeeGuide;