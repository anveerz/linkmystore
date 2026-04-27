import type { ReactNode } from 'react'

export default function LegalSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-[#dfe7fb] pt-6 first:border-t-0 first:pt-0 sm:pt-8">
      <h2 className="text-lg font-semibold leading-snug text-[#101a3a] sm:text-2xl">{title}</h2>
      <div className="legal-prose mt-4 space-y-4 text-[0.95rem] sm:mt-5 sm:text-base">{children}</div>
    </section>
  )
}
