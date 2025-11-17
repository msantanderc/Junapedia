import React from 'react'

interface FiltersProps {
  activeTab: 'restaurants' | 'supermarkets'
  selectedCategory: string
  onCategoryChange: (category: string) => void
  communes?: string[]
  selectedComuna?: string
  onComunaChange?: (comuna: string) => void
}

const restaurantCategories = [
  { id: 'all', label: 'Todas las categorías' },
  { id: 'restaurantes', label: 'Restaurantes' },
  { id: 'casinos', label: 'Casinos' },
  { id: 'minimarket', label: 'MiniMarket' },
  { id: 'patio de comida', label: 'Patio de comida' },
  { id: 'puntos verdes', label: 'Puntos verdes' },
]

const supermarketCategories = [
  { id: 'all', label: 'Todas' },
  { id: 'supermercados', label: 'Supermercados' },
]

export default function Filters({ activeTab, selectedCategory, onCategoryChange, communes = [], selectedComuna = 'all', onComunaChange }: FiltersProps) {
  const categories = activeTab === 'restaurants' ? restaurantCategories : supermarketCategories
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-md border border-green-100">
        <h3 className="text-lg font-semibold text-foreground mb-4">Categorías</h3>
        <div className="space-y-3">
          {categories.map((cat) => (
            <label key={cat.id} className="flex items-center cursor-pointer group">
              <input
                type="radio"
                name="category"
                value={cat.id}
                checked={selectedCategory === cat.id}
                onChange={() => onCategoryChange(cat.id)}
                className="w-4 h-4 accent-primary"
              />
              <span className="ml-3 text-sm text-foreground group-hover:text-primary transition-colors">
                {cat.label}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-lg p-6 shadow-md border border-green-100">
        <h3 className="text-lg font-semibold text-foreground mb-4">Comuna</h3>
        <select
          value={selectedComuna}
          onChange={(e) => onComunaChange && onComunaChange(e.target.value)}
          className="w-full border px-3 py-2 rounded-md"
          disabled={!communes || communes.length === 0}
        >
          <option value="all">Todas las comunas</option>
          {communes && communes.length > 0 ? communes.map(c => (
            <option key={c} value={c}>{c}</option>
          )) : (
            <option value="">No hay comunas disponibles</option>
          )}
        </select>
      </div>
    </div>
  )
}
