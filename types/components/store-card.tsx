import { MapPin, Clock, ExternalLink, Globe } from 'lucide-react'
import { useState } from 'react'

interface StoreCardProps {
  id: string
  name: string
  category: string
  floor: string
  image?: string
  hours?: string
  description?: string
  onClick?: () => void
  onVisit?: () => void
  onOpenMaps?: () => void
  logoCandidates?: string[]
}

export default function StoreCard({
  name,
  category,
  floor,
  image,
  hours,
  description,
  onClick,
  onVisit,
  onOpenMaps,
  logoCandidates,
}: StoreCardProps) {
  const [logoIdx, setLogoIdx] = useState(0 as number)
  const candidates = logoCandidates && logoCandidates.length > 0 ? logoCandidates : (image ? [image] : [])
  return (
    <div onClick={onClick} className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-green-100 hover:border-primary group cursor-pointer">
      <div className="relative overflow-hidden h-48 bg-pluxee-100 border-b border-pluxee-200">
        {candidates && candidates[logoIdx] ? (
          <img
            src={candidates[logoIdx]}
            alt={name}
            className="w-full h-full object-contain p-6 bg-pluxee-100 group-hover:scale-105 transition-transform duration-300"
            onError={() => {
              if (logoIdx < (candidates?.length || 0) - 1) setLogoIdx(logoIdx + 1)
              else setLogoIdx(logoIdx) // stay
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary/40">
            <MapPin className="w-10 h-10" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/0 transition-colors" />
        <div className="absolute top-4 right-4 bg-pluxee-700 text-white px-3 py-1 rounded-full text-xs font-semibold">
          {category}
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-2">{name}</h3>
        
        {description ? (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{description}</p>
        ) : null}

        <div className="space-y-3 mb-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="font-medium">{floor}</span>
          </div>
          {hours ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-xs">{hours}</span>
            </div>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {onOpenMaps ? (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenMaps?.(); }}
              className="w-full bg-pluxee-700 text-white py-2 rounded-lg font-semibold hover:bg-pluxee-600 transition-colors flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4" /> Abrir en Google Maps
            </button>
          ) : null}
          <button onClick={(e) => { e.stopPropagation(); onVisit?.(); }} className="w-full bg-pluxee-700 text-white py-2 rounded-lg font-semibold hover:bg-pluxee-600 transition-colors flex items-center justify-center gap-2 group">
            <Globe className="w-4 h-4" />
            <span>Sitio web</span>
          </button>
        </div>
      </div>
    </div>
  )
}
