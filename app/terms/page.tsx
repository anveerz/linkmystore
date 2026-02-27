import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
        <h1 className="text-2xl font-bold text-[#0F172A]">Terms of Service</h1>
        <p className="text-gray-500 mt-4 leading-relaxed">
          Coming soon. For questions, email{' '}
          <a
            href="mailto:hello@linkmystore.in"
            className="text-[#E8651A] hover:underline font-medium"
          >
            hello@linkmystore.in
          </a>
        </p>
        <Link
          href="/"
          className="inline-block mt-8 text-sm font-medium text-gray-500 hover:text-[#0F172A] transition-colors"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  )
}
