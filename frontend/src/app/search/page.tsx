'use client'
import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { searchAPI } from '@/lib/api'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    category: '',
    country: ''
  })

  const handleSearch = async () => {
    if (!query.trim()) return
    
    setLoading(true)
    try {
      const response = await searchAPI.search({
        q: query,
        ...filters,
        limit: 20
      })
      setResults(response.data.data.products)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (query.length > 2) {
      const timer = setTimeout(handleSearch, 500)
      return () => clearTimeout(timer)
    }
  }, [query, filters])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Search Products</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, brands, ingredients..."
              className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600"
          >
            Search
          </button>
        </div>

        <div className="flex gap-4">
          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            className="p-2 border rounded"
          >
            <option value="">All Categories</option>
            <option value="beverages">Beverages</option>
            <option value="snacks">Snacks</option>
            <option value="dairy">Dairy</option>
          </select>

          <select
            value={filters.country}
            onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
            className="p-2 border rounded"
          >
            <option value="">All Countries</option>
            <option value="India">India</option>
            <option value="USA">USA</option>
            <option value="UK">UK</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
        </div>
      )}

      <div className="grid gap-4">
        {results.map((product) => (
          <div key={product.id} className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
            <p className="text-gray-600 mb-2">Brand: {product.brand}</p>
            <p className="text-gray-600 mb-2">Category: {product.category}</p>
            <p className="text-gray-600 mb-2">Country: {product.country}</p>
            {product.price && (
              <p className="text-green-600 font-semibold">
                Price: {product.currency} {product.price}
              </p>
            )}
            {product.description && (
              <p className="text-gray-700 mt-2">{product.description}</p>
            )}
          </div>
        ))}
      </div>

      {results.length === 0 && query && !loading && (
        <div className="text-center py-8 text-gray-500">
          No products found for "{query}"
        </div>
      )}
    </div>
  )
}