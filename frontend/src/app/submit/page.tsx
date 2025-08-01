'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, MapPin } from 'lucide-react'
import { submissionsAPI } from '@/lib/api'

export default function SubmitPage() {
  const [formData, setFormData] = useState({
    product_name: '',
    brand: '',
    category: '',
    store_name: '',
    store_type: '',
    purchase_price: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await submissionsAPI.create(formData)
      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  if (success) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-green-100 text-green-700 p-6 rounded-lg text-center">
          <h2 className="text-xl font-semibold mb-2">Submission Successful!</h2>
          <p>Your NPD submission has been received. You'll earn ₹300 base reward once approved.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Submit New Product</h1>
      
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Product Name *</label>
              <input
                type="text"
                name="product_name"
                value={formData.product_name}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Brand *</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select Category</option>
              <option value="beverages">Beverages</option>
              <option value="snacks">Snacks</option>
              <option value="dairy">Dairy</option>
              <option value="bakery">Bakery</option>
              <option value="frozen">Frozen Foods</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Store Name</label>
              <input
                type="text"
                name="store_name"
                value={formData.store_name}
                onChange={handleChange}
                placeholder="e.g., Big Bazaar, DMart"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Store Type</label>
              <select
                name="store_type"
                value={formData.store_type}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Type</option>
                <option value="supermarket">Supermarket</option>
                <option value="hypermarket">Hypermarket</option>
                <option value="convenience">Convenience Store</option>
                <option value="online">Online</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Purchase Price (₹)</label>
            <input
              type="number"
              name="purchase_price"
              value={formData.purchase_price}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Take photos of the product</p>
            <p className="text-sm text-gray-500">Front, back, ingredients label (required for approval)</p>
            <button
              type="button"
              className="mt-4 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
            >
              Add Photos
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>Location will be automatically detected</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-500 text-white p-3 rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Product (Earn ₹300)'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Reward Information</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Base reward: ₹300 for approved submissions</li>
            <li>• Regional bonus: +₹50 for local/regional products</li>
            <li>• Quality bonus: Up to +₹50 based on submission quality</li>
          </ul>
        </div>
      </div>
    </div>
  )
}