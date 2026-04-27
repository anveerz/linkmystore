import Link from 'next/link'

export default function StoreNotFoundPage() {
  return (
    <div className="max-w-lg mx-auto min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-xl font-bold text-[#0F172A] mb-2">Store not found</h1>
        <p className="text-gray-500 text-sm mb-6">
          This store does not exist or has been deactivated.
        </p>
        <Link href="/login" className="btn-primary">
          Create your own store
        </Link>
      </div>
    </div>
  )
}
