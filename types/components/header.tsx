import { Search } from 'lucide-react'

interface HeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
}

export default function Header({ searchQuery, onSearchChange }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-pluxee-700 to-pluxee-500 text-white shadow-lg">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Junapedia</h1>
          <p className="text-green-50 text-lg">Encuentra dónde usar tu tarjeta</p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-white/60" />
          <input
            type="text"
            placeholder="Buscar locales..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-white/20 border border-white/30 rounded-lg pl-12 pr-4 py-3 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
          />
        </div>
      </div>
    </header>
  )
}
