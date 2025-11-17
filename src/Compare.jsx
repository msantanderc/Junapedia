import React, { useState, useEffect } from 'react';
import { initSupabase, fetchStoresFromSupabase } from './supabase';

export default function Compare() {
  const [filter, setFilter] = useState('');
  const [onlyMerged, setOnlyMerged] = useState(false);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        initSupabase(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
        const items = await fetchStoresFromSupabase();
        setStores(Array.isArray(items) ? items : []);
      } catch (e) {
        console.error('Error loading stores from Supabase', e);
        setStores([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const visible = stores.filter(s => {
    if (onlyMerged && !s.merged) return false;
    if (!filter) return true;
    return (s.canonicalName || '').toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Locales Unificados</h2>

      <div className="flex gap-3 mb-4 items-center">
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar por nombre" className="px-3 py-2 border rounded flex-1" />
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={onlyMerged} onChange={e => setOnlyMerged(e.target.checked)} />
          <span className="text-sm">Sólo unidos</span>
        </label>
      </div>

      {loading && <div>Cargando locales desde Supabase...</div>}

      {!loading && visible.length === 0 && <div>No hay locales que mostrar.</div>}

      <div className="space-y-4">
        {visible.map(s => (
          <div key={s.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-lg">{s.canonicalName || '(sin nombre)'}</h3>
              <div className={`px-2 py-1 rounded text-xs ${s.merged ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {s.merged ? 'merged' : 'unmerged'}
              </div>
            </div>
            {Array.isArray(s.addresses) && s.addresses.length > 0 && (
              <ul className="mt-3 list-disc list-inside text-sm text-gray-700">
                {s.addresses.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            )}
            {(!Array.isArray(s.addresses) || s.addresses.length === 0) && (
              <div className="mt-2 text-sm text-gray-500">Sin direcciones registradas.</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
