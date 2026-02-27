"use client"
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

export default function FAQ({ items, dark }: { items: FAQItem[]; dark?: boolean }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i)

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={dark
        ? { border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }
        : { border: '1px solid #E5E5EC', background: '#fff' }
      }
    >
      {items.map((item, i) => (
        <div
          key={i}
          style={dark
            ? { borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)' }
            : { borderTop: i === 0 ? 'none' : '1px solid #F0F0F5' }
          }
        >
          <button
            onClick={() => toggle(i)}
            className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left transition-colors duration-200"
            style={dark ? {} : {}}
            onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : '#F7F5FB' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <span
              className="text-base font-semibold"
              style={{ color: dark ? '#ffffff' : '#1A1A2E' }}
            >
              {item.question}
            </span>
            <ChevronDown
              size={18}
              className={`shrink-0 transition-transform duration-300 ${openIndex === i ? 'rotate-180' : ''}`}
              style={{ color: '#FB923C' }}
            />
          </button>
          <div
            className={`grid transition-all duration-300 ease-in-out ${openIndex === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
          >
            <div className="overflow-hidden">
              <p
                className="px-6 pb-5 text-sm leading-relaxed"
                style={{ color: dark ? 'rgba(216,180,254,0.75)' : '#555567' }}
              >
                {item.answer}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
