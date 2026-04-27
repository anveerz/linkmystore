import Link from 'next/link'

export default function ProductNotFoundPage() {
  return (
    <div className="max-w-lg mx-auto min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-xl font-bold text-[#0F172A] mb-2">Product not found</h1>
        <p className="text-gray-500 text-sm mb-6">
          This product does not exist or is no longer available.
        </p>
        <Link href="/" className="btn-primary">
          Back to home
        </Link>
      </div>
    </div>
  )
}
