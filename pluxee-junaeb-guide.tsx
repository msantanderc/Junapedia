import React, { useState, useEffect } from 'react';
import { FRANCHISE_NAME_MAP } from './src/franchiseNames.js';
import { Search, MapPin, DollarSign, Store as StoreIcon, X, Globe } from 'lucide-react';
import { WEBSITE_MAP } from './src/websiteMap.js';
import { Button } from './components/ui/button';
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
    // token keys in the map are expected normalized (lowercase, single words)
    if (norm === t || norm.includes(t) || compact.includes(t) || (name || '').toLowerCase().includes(t)) {
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
    if (norm === t) return t;
  }
  for (const t of tokens) {
    if (norm.includes(t) || compact.includes(t) || (name || '').toLowerCase().includes(t)) return t;
  }
  for (const m of members || []) {
    const mn = normalizeForKey(m && (m.name || m.canonical_name || ''));
    const mcompact = mn.replace(/\s+/g, '');
    for (const t of tokens) {
      if (mn === t || mn.includes(t) || mcompact.includes(t) || (m.name || '').toLowerCase().includes(t)) {
        return t;
      }
    }
  }
  return null;
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

const PluxeeGuide = () => {
  console.log('PluxeeGuide: component render start');
  const [stores, setStores] = useState<CanonicalStore[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStore, setSelectedStore] = useState<CanonicalStore | null>(null);
  const [activeTab, setActiveTab] = useState<'restaurants' | 'supermarkets'>('restaurants');
  const [loading, setLoading] = useState<boolean>(true);
  // Firestore access state removed; app uses Supabase-only
  const prevIdsRef = React.useRef<string[]>([]);

  const categories = ['all', 'Comida Rápida', 'Restaurante', 'Cafetería', 'Panadería', 'Supermercado'];

  useEffect(() => {
    console.log('PluxeeGuide: useEffect mount -> calling loadStores');
    loadStores();
    console.log('PluxeeGuide: useEffect after loadStores call');
  }, []);

  // initialStores removed — data is now sourced from Supabase.

  const loadStores = async (): Promise<void> => {
    setLoading(true);
    try {
      // Use the shared supabase helper. It auto-initializes from Vite env if available.
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
        }
      } catch (err) {
        console.error('Error fetching from Supabase:', err);
        setStores([]);
        prevIdsRef.current = [];
        setLoading(false);
        return;
      }
      // Supabase-only mode: no Firestore fallback. If Supabase fetch failed above, the function already returned.
    } catch (error: any) {
      const msg = error?.message || String(error);
      console.error('loadStores: final caught error, auth/status unknown:', msg, error);
      console.error('Error loading stores:', error);
      setStores([]);
    } finally {
      setLoading(false);
    }
  };
  // Removed client update/check features by request

  const filteredStores = (() => {
    const q = normalizeText(searchTerm || '');
    return stores.filter((store: CanonicalStore) => {
      const nameNorm = normalizeText(store.name);
      const addressesNorm = (store.addresses || []).map(a => normalizeText(a)).join(' ');
      const matchesSearch = q === '' || nameNorm.includes(q) || addressesNorm.includes(q);
      const matchesCategory = selectedCategory === 'all' || (store.category || '') === selectedCategory;
      const matchesTab = activeTab === 'restaurants'
        ? (store.category || '') !== 'Supermercado'
        : (store.category || '') === 'Supermercado';
      return matchesSearch && matchesCategory && matchesTab;
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
      <div className="bg-gradient-to-r from-pluxee-700 to-pluxee-500 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <HeaderLogo />
              <div>
                <h1 className="text-3xl font-bold">Junapedia</h1>
                <p className="text-pluxee-100 mt-1">Encuentra dónde usar tu tarjeta</p>
              </div>
            </div>
            <div />
          </div>
        </div>
      </div>

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

        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre o ubicación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pluxee-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pluxee-500 focus:border-transparent"
            >
              <option value="all">Todas las categorías</option>
              {activeTab === 'restaurants' ? (
                <>
                  <option value="Comida Rápida">Comida Rápida</option>
                  <option value="Restaurante">Restaurante</option>
                  <option value="Cafetería">Cafetería</option>
                  <option value="Panadería">Panadería</option>
                </>
              ) : (
                <option value="Supermercado">Supermercado</option>
              )}
            </select>
          </div>
        </div>

        {/* Debug panel removed */}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groupedDisplay.map(item => {
            if (item.type === 'single') {
              const store = item.store;
              const displayName = item.name || store.name;
              const token = findFranchiseKey(displayName || '', []);
              return (
                <div
                  key={store.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition cursor-pointer overflow-hidden"
                  onClick={() => setSelectedStore(store)}
                >
                  <div className="bg-gradient-to-r from-pluxee-600 to-pluxee-400 text-white px-4 py-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{displayName}</h3>
                        <span className="text-xs bg-white/20 px-2 py-1 rounded-full inline-block mt-1">
                          {store.category}
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); openWebsite(displayName, token); }}
                        title="Abrir sitio web"
                        className="text-white/90 hover:text-white"
                      >
                        <Globe size={22} />
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start gap-2 text-gray-600 mb-2">
                      <MapPin size={16} className="mt-1 flex-shrink-0" />
                      <span className="text-sm">{store.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <DollarSign size={16} />
                      <span className="text-sm text-pluxee-700">{store.menuItems?.length || 0} productos</span>
                    </div>
                    {/* Open in Google Maps button with address as label */}
                    {store.address && (
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); openInGoogleMaps(store.address); }}
                          className="w-full justify-start"
                          title="Abrir en Google Maps"
                        >
                          📍 {store.address}
                        </Button>
                      </div>
                    )}
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); openWebsite(displayName, token); }}
                        className="w-full justify-start gap-2"
                        title="Abrir sitio web"
                      >
                        <Globe size={16} />
                        <span>Sitio web</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }
            // group
            const grp = item;
            const token = grp.key;
            return (
              <div
                key={`group-${grp.key}`}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition cursor-pointer overflow-hidden border-2 border-dashed"
                onClick={() => setSelectedGroup(grp)}
              >
                <div className="bg-gradient-to-r from-pluxee-600 to-pluxee-400 text-white px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{grp.name} <span className="text-sm font-normal">({grp.count})</span></h3>
                      <span className="text-xs bg-white/20 px-2 py-1 rounded-full inline-block mt-1">Grupo</span>
                    </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); openWebsite(grp.name, token); }}
                        title="Abrir sitio web de la franquicia"
                        className="text-white/90 hover:text-white"
                      >
                        <Globe size={22} />
                      </button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start gap-2 text-gray-600 mb-2">
                    <MapPin size={16} className="mt-1 flex-shrink-0" />
                    <span className="text-sm">{(grp.addresses && grp.addresses[0]) || ''}</span>
                  </div>
                  <div className="text-sm text-gray-600">Contiene {grp.count} locales. Haz clic para ver miembros.</div>
                </div>
              </div>
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
              <h2 className="text-2xl font-bold">{group.name} — Grupo ({group.count})</h2>
              <span className="text-sm bg-white/20 px-3 py-1 rounded-full inline-block mt-2">Grupo consolidado</span>
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
            <h3 className="font-semibold">Miembros del grupo</h3>
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