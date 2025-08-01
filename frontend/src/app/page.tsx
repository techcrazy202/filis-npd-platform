import Link from 'next/link'
import { Search, Plus, BarChart3 } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Fi-Lis NPD Platform
        </h1>
        <p className="text-xl text-gray-600">
          Food Industry Analytics & New Product Development
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        <Link href="/search" className="group">
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <Search className="w-12 h-12 text-primary-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Search Products</h2>
            <p className="text-gray-600">
              Search through 275K+ food products with advanced filters
            </p>
          </div>
        </Link>

        <Link href="/submit" className="group">
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <Plus className="w-12 h-12 text-primary-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Submit NPD</h2>
            <p className="text-gray-600">
              Discover new products and earn rewards up to ₹350
            </p>
          </div>
        </Link>

        <Link href="/dashboard" className="group">
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <BarChart3 className="w-12 h-12 text-primary-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Dashboard</h2>
            <p className="text-gray-600">
              Track your submissions and earnings
            </p>
          </div>
        </Link>
      </div>

      <div className="text-center mt-12">
        <Link 
          href="/auth/login"
          className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors"
        >
          Get Started
        </Link>
      </div>
    </div>
  )
}