interface FilterSidebarProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  selectedFloor: string
  onFloorChange: (floor: string) => void
}

const categories = [
  { id: 'all', label: 'All Categories' },
  { id: 'fashion', label: 'Fashion & Apparel' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'dining', label: 'Dining & Food' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'services', label: 'Services' },
]

const floors = [
  { id: 'all', label: 'All Floors' },
  { id: 'g', label: 'Ground Floor' },
  { id: '1', label: 'Floor 1' },
  { id: '2', label: 'Floor 2' },
  { id: '3', label: 'Floor 3' },
]

export default function FilterSidebar({
  selectedCategory,
  onCategoryChange,
  selectedFloor,
  onFloorChange,
}: FilterSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="bg-white rounded-lg p-6 shadow-md border border-green-100">
        <h3 className="text-lg font-semibold text-foreground mb-4">Categories</h3>
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

      {/* Floor Filter */}
      <div className="bg-white rounded-lg p-6 shadow-md border border-green-100">
        <h3 className="text-lg font-semibold text-foreground mb-4">Floors</h3>
        <div className="space-y-3">
          {floors.map((floor) => (
            <label key={floor.id} className="flex items-center cursor-pointer group">
              <input
                type="radio"
                name="floor"
                value={floor.id}
                checked={selectedFloor === floor.id}
                onChange={() => onFloorChange(floor.id)}
                className="w-4 h-4 accent-primary"
              />
              <span className="ml-3 text-sm text-foreground group-hover:text-primary transition-colors">
                {floor.label}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
