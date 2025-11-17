import StoreCard from './store-card'

interface GridStore {
  id: string
  name: string
  category: string
  address?: string
  image?: string
  hours?: string
  description?: string
  logoCandidates?: string[]
}

interface StoreGridProps {
  stores: GridStore[]
  searchQuery: string
  selectedCategory: string
  onOpenStore?: (store: GridStore) => void
  onVisit?: (store: GridStore) => void
  onOpenMaps?: (store: GridStore) => void
}

export default function StoreGrid({
  stores,
  searchQuery,
  selectedCategory,
  onOpenStore,
  onVisit,
  onOpenMaps,
}: StoreGridProps) {
  const q = searchQuery?.toLowerCase() || ''
  const filteredStores = (stores || []).filter((store) => {
    const name = store.name?.toLowerCase() || ''
    const desc = store.description?.toLowerCase() || ''
    const matchesSearch = name.includes(q) || desc.includes(q)
    const matchesCategory = selectedCategory === 'all' || (store.category || '').toLowerCase() === selectedCategory.toLowerCase()
    return matchesSearch && matchesCategory
  })

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">
          {filteredStores.length} {filteredStores.length === 1 ? 'local encontrado' : 'locales encontrados'}
        </h2>
      </div>

      {filteredStores.length > 0 ? (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
          {filteredStores.map((store) => (
            <StoreCard
              key={store.id}
              id={store.id}
              name={store.name}
              category={store.category}
              floor={store.address || ''}
              image={store.image}
              logoCandidates={store.logoCandidates}
              hours={store.hours || ''}
              description={store.description || ''}
              onClick={() => onOpenStore?.(store)}
              onVisit={() => onVisit?.(store)}
              onOpenMaps={() => onOpenMaps?.(store)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-green-100">
          <div className="text-6xl mb-4">🏪</div>
          <h3 className="text-2xl font-bold text-foreground mb-2">Sin resultados</h3>
          <p className="text-muted-foreground">Ajusta tu búsqueda o filtros</p>
        </div>
      )}
    </div>
  )
}
