'use client'
import { useState, useEffect } from 'react'
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react'
import { searchAPI } from '@/lib/api'

type SortField = 'id' | 'country' | 'industry' | 'sector' | 'sub_sector'
type SortDirection = 'asc' | 'desc'

interface FilisData {
  id: string
  continentsdb: string
  country: string
  industry: string
  sector: string
  sub_sector: string
  relevance_score?: number
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FilisData[]>([])
  const [loading, setLoading] = useState(false)
  const [sortField, setSortField] = useState<SortField>('id')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [filters, setFilters] = useState({
    category: '',
    country: ''
  })
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalItems: 0
  })

  const handleSearch = async (page = 1) => {
    setLoading(true)
    try {
      const response = await searchAPI.search({
        q: query,
        ...filters,
        page,
        limit: 50
      })
      setResults(response.data.data.products)
      setPagination(response.data.data.pagination)
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedResults = [...results].sort((a, b) => {
    const aVal = a[sortField] || ''
    const bVal = b[sortField] || ''
    
    if (sortDirection === 'asc') {
      return aVal.toString().localeCompare(bVal.toString())
    } else {
      return bVal.toString().localeCompare(aVal.toString())
    }
  })

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4" />
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-4 h-4" /> : 
      <ArrowDown className="w-4 h-4" />
  }

  useEffect(() => {
    handleSearch()
  }, [filters])

  useEffect(() => {
    if (query.length > 2) {
      const timer = setTimeout(() => handleSearch(), 500)
      return () => clearTimeout(timer)
    } else if (query.length === 0) {
      handleSearch()
    }
  }, [query])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Fi-Lis Data Search</h1>
      
      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by continent, country, industry, sector..."
              className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => handleSearch()}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Search
          </button>
        </div>

        <div className="flex gap-4 items-center flex-wrap">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            className="p-2 border rounded focus:ring-2 focus:ring-blue-500 min-w-32"
          >
            <option value="">All Industries</option>
            <option value="Food">Food</option>
            <option value="Beverage">Beverage</option>
            <option value="Agriculture">Agriculture</option>
          </select>

          <select
            value={filters.country}
            onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
            className="p-2 border rounded focus:ring-2 focus:ring-blue-500 min-w-32"
          >
            <option value="">All Countries</option>
            <option value="India">India</option>
            <option value="USA">USA</option>
            <option value="France">France</option>
            <option value="United Arab Emirates">UAE</option>
          </select>
          
          <div className="text-sm text-gray-500">
            Total Records: 272,204
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-4 text-gray-600">
        {pagination.totalItems > 0 && (
          <p>Showing {results.length} of {pagination.totalItems} results</p>
        )}
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Searching...</p>
        </div>
      )}

      {/* Results Grid */}
      {!loading && sortedResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 border-b font-semibold text-gray-700">
            <button
              onClick={() => handleSort('id')}
              className="flex items-center gap-2 hover:text-blue-600 transition-colors text-left"
            >
              ID {getSortIcon('id')}
            </button>
            <div>Continent</div>
            <button
              onClick={() => handleSort('country')}
              className="flex items-center gap-2 hover:text-blue-600 transition-colors text-left"
            >
              Country {getSortIcon('country')}
            </button>
            <button
              onClick={() => handleSort('industry')}
              className="flex items-center gap-2 hover:text-blue-600 transition-colors text-left"
            >
              Industry {getSortIcon('industry')}
            </button>
            <button
              onClick={() => handleSort('sector')}
              className="flex items-center gap-2 hover:text-blue-600 transition-colors text-left"
            >
              Sector {getSortIcon('sector')}
            </button>
            <button
              onClick={() => handleSort('sub_sector')}
              className="flex items-center gap-2 hover:text-blue-600 transition-colors text-left"
            >
              Sub-Sector {getSortIcon('sub_sector')}
            </button>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200">
            {sortedResults.map((item, index) => (
              <div 
                key={item.id} 
                className={`grid grid-cols-6 gap-4 p-4 hover:bg-gray-50 transition-colors ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                }`}
              >
                <div className="font-mono text-sm text-gray-600">{item.id}</div>
                <div className="text-sm">{item.continentsdb || '-'}</div>
                <div className="text-sm font-medium">{item.country || '-'}</div>
                <div className="text-sm">{item.industry || '-'}</div>
                <div className="text-sm">{item.sector || '-'}</div>
                <div className="text-sm">{item.sub_sector || '-'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            onClick={() => handleSearch(pagination.currentPage - 1)}
            disabled={!pagination.hasPreviousPage}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          
          <span className="text-gray-600">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          
          <button
            onClick={() => handleSearch(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* No Results */}
      {!loading && results.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            {query ? `No results found for "${query}"` : 'Start searching to see results'}
          </h3>
          <p className="text-gray-500">
            Try adjusting your search terms or filters
          </p>
        </div>
      )}
    </div>
  )
}