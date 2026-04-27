import type { ReactNode } from 'react'
import Link from 'next/link'

export default function LegalPageShell({
  title,
  description,
  matchContactStyle = false,
  children,
}: {
  title: string
  description: string
  matchContactStyle?: boolean
  children: ReactNode
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_-18%,rgba(79,124,255,0.2),transparent_46%),radial-gradient(circle_at_92%_2%,rgba(122,93,255,0.17),transparent_42%),linear-gradient(180deg,#f8faff_0%,#f2f6ff_52%,#edf3ff_100%)] pb-12 sm:pb-16">
      <section
        className={
          matchContactStyle
            ? 'border-b border-[#dfe7fb]'
            : 'relative overflow-hidden border-b border-[#cfdbf7] bg-[radial-gradient(circle_at_12%_-18%,rgba(79,124,255,0.26),transparent_44%),radial-gradient(circle_at_92%_2%,rgba(122,93,255,0.22),transparent_40%),linear-gradient(180deg,#edf3ff_0%,#e4edff_52%,#dbe7ff_100%)]'
        }
      >
        {!matchContactStyle && (
          <div className="absolute inset-x-0 top-0 h-40 sm:h-48 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.55),_transparent_70%)]" />
        )}
        <div className="mx-auto max-w-4xl px-4 py-9 sm:px-6 sm:py-16">
          {matchContactStyle ? (
            <>
              <h1 className="mt-3 text-3xl font-bold leading-tight tracking-[-0.015em] text-[#111a38] sm:mt-4 sm:text-5xl">
                {title}
              </h1>
              <p className="mt-3 max-w-3xl text-[0.95rem] leading-7 text-[#4b5a7f] sm:mt-4 sm:text-lg">{description}</p>
            </>
          ) : (
            <div className="rounded-3xl border border-white/72 bg-white/62 px-5 py-5 shadow-[0_20px_52px_rgba(52,82,170,0.12)] backdrop-blur-sm sm:px-7 sm:py-6">
              <h1 className="text-3xl font-bold leading-tight tracking-[-0.015em] text-[#0d1735] sm:text-5xl">{title}</h1>
              <p className="mt-3 max-w-3xl text-[0.95rem] leading-7 text-[#3f5278] sm:mt-4 sm:text-lg">{description}</p>
            </div>
          )}

          <div className="mt-5 text-sm font-medium text-[#5f6c90] sm:mt-6">
            <Link href="/" className="text-[#4f7cff] transition hover:underline">
              Back to home
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-7 sm:px-6 sm:py-12">
        {matchContactStyle ? (
          <div className="space-y-8 sm:space-y-10">{children}</div>
        ) : (
          <div className="rounded-3xl border border-white/72 bg-white/62 px-5 py-5 shadow-[0_20px_52px_rgba(52,82,170,0.1)] backdrop-blur-sm sm:px-7 sm:py-8">
            <div className="space-y-8 sm:space-y-10">{children}</div>
          </div>
        )}
      </section>
    </main>
  )
}
