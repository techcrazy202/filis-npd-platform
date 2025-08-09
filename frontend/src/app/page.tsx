'use client'
import Link from 'next/link'
import { Search, Plus, BarChart3, Database, TrendingUp, Award } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Database className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Fi-Lis</h1>
          </div>
          <div className="flex gap-4">
            {isLoggedIn ? (
              <>
                <Link href="/search" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Search
                </Link>
                <Link href="/dashboard" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Dashboard
                </Link>
                <button 
                  onClick={() => {
                    localStorage.removeItem('token')
                    setIsLoggedIn(false)
                  }}
                  className="text-gray-600 hover:text-red-600 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Login
                </Link>
                <Link href="/auth/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Fi-Lis NPD Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Comprehensive Food Industry Analytics & New Product Development Platform
            <br />
            <span className="text-blue-600 font-semibold">272,204+ Records</span> from global food industry
          </p>
          
          {!isLoggedIn ? (
            <div className="flex gap-4 justify-center">
              <Link 
                href="/auth/login"
                className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
              >
                Login to Search
              </Link>
              <Link 
                href="/auth/register"
                className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors shadow-lg border-2 border-blue-600"
              >
                Create Account
              </Link>
            </div>
          ) : (
            <Link 
              href="/search"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg inline-block"
            >
              Start Searching
            </Link>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          <Link href={isLoggedIn ? "/search" : "/auth/login"} className="group">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow group-hover:scale-105 transform transition-transform">
              <Search className="w-16 h-16 text-blue-600 mb-6" />
              <h2 className="text-2xl font-semibold mb-4">Advanced Search</h2>
              <p className="text-gray-600 mb-4">
                Search through 272K+ food industry records with real-time filtering by continent, country, industry, and sector.
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Multi-column sortable grid</li>
                <li>• Boolean operators support</li>
                <li>• Real-time autocomplete</li>
                <li>• Export capabilities</li>
              </ul>
            </div>
          </Link>

          <Link href={isLoggedIn ? "/submit" : "/auth/login"} className="group">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow group-hover:scale-105 transform transition-transform">
              <Plus className="w-16 h-16 text-green-600 mb-6" />
              <h2 className="text-2xl font-semibold mb-4">NPD Crowdsourcing</h2>
              <p className="text-gray-600 mb-4">
                Discover new products not in our database and earn rewards up to ₹350 per validated submission.
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• ₹300 base reward</li>
                <li>• ₹50 regional bonus</li>
                <li>• AI-assisted validation</li>
                <li>• Tier-based multipliers</li>
              </ul>
            </div>
          </Link>

          <Link href={isLoggedIn ? "/dashboard" : "/auth/login"} className="group">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow group-hover:scale-105 transform transition-transform">
              <BarChart3 className="w-16 h-16 text-purple-600 mb-6" />
              <h2 className="text-2xl font-semibold mb-4">Analytics Dashboard</h2>
              <p className="text-gray-600 mb-4">
                Track your submissions, earnings, and performance with comprehensive analytics and insights.
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Submission tracking</li>
                <li>• Earnings overview</li>
                <li>• Quality scoring</li>
                <li>• Performance metrics</li>
              </ul>
            </div>
          </Link>
        </div>

        {/* Stats Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Platform Statistics</h2>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">272K+</div>
              <div className="text-gray-600">Food Industry Records</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">50+</div>
              <div className="text-gray-600">Countries Covered</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600 mb-2">₹300</div>
              <div className="text-gray-600">Base Reward per NPD</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-600 mb-2">24/7</div>
              <div className="text-gray-600">Platform Availability</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        {!isLoggedIn && (
          <div className="text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white p-12 rounded-xl shadow-lg">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of food industry professionals using Fi-Lis for market research and NPD discovery.
            </p>
            <div className="flex gap-4 justify-center">
              <Link 
                href="/auth/register"
                className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Create Free Account
              </Link>
              <Link 
                href="/auth/login"
                className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
              >
                Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}