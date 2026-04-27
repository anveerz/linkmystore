"use client"
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

export default function FAQ({ items, dark }: { items: FAQItem[]; dark?: boolean }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (index: number) => setOpenIndex(openIndex === index ? null : index)

  return (
    <div className={dark ? 'border-t border-white/15' : 'border-t border-[#dce5fb]'}>
      {items.map((item, index) => {
        const isOpen = openIndex === index
        return (
          <div
            key={index}
            className={`${
              index === 0 ? '' : dark ? 'border-t border-white/10' : 'border-t border-[#e9efff]'
            }`}
          >
            <button
              onClick={() => toggle(index)}
              className={`flex w-full items-center justify-between gap-4 py-5 text-left transition-colors duration-200 ${
                dark ? 'hover:bg-white/5' : 'hover:bg-transparent'
              }`}
            >
              <span className={`text-base font-semibold ${dark ? 'text-white' : 'text-[#111a38]'}`}>
                {item.question}
              </span>
              <ChevronDown
                size={18}
                className={`shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${
                  dark ? 'text-white/75' : 'text-[#4f7cff]'
                }`}
              />
            </button>
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <p className={`pb-5 text-sm leading-relaxed ${dark ? 'text-white/80' : 'text-[#4f5b80]'}`}>
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
