'use client'

import { useState } from 'react'
import Header from '@/components/header'
import StoreGrid from '@/components/store-grid'
import FilterSidebar from '@/components/filter-sidebar'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedFloor, setSelectedFloor] = useState('all')

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-4">
          <aside className="lg:col-span-1">
            <FilterSidebar
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              selectedFloor={selectedFloor}
              onFloorChange={setSelectedFloor}
            />
          </aside>
          
          <div className="lg:col-span-3">
            <StoreGrid
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              selectedFloor={selectedFloor}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
