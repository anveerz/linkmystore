import Image from 'next/image'
import { Package, Rocket, Wallet, Zap, type LucideIcon } from 'lucide-react'

const featureCards: { icon: LucideIcon; text: string }[] = [
  { icon: Zap, text: 'Set up your store in 2 minutes' },
  { icon: Wallet, text: 'Gateway checkout + Manual UPI mode' },
  { icon: Package, text: 'Sell physical + digital products' },
  { icon: Rocket, text: 'No own-product platform commission' },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-shell min-h-screen flex">
      <div className="hidden lg:flex lg:w-[48%] bg-gradient-to-br from-[#0f183f] via-[#3a5adf] to-[#7459ff] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-10 right-[-80px] h-[300px] w-[300px] rounded-full bg-[rgba(142,166,255,0.28)] blur-3xl" />
        <div className="absolute bottom-6 left-[-40px] h-[220px] w-[220px] rounded-full bg-[rgba(191,165,255,0.26)] blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.16] to-transparent" />

        <div className="relative z-10">
          <Image
            src="/logo-v2.png"
            alt="LinkMyStore"
            height={160}
            width={160}
            className="h-40 w-40 object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.35)]"
          />
          <p className="mt-5 max-w-sm text-lg leading-relaxed text-white/90">
            Turn your social media audience into paying customers
          </p>

          <div className="mt-14 space-y-3">
            {featureCards.map((feature, index) => (
              <div
                key={feature.text}
                className="group flex items-center gap-3 rounded-2xl border border-white/25 bg-white/12 px-4 py-3 backdrop-blur-md animate-slide-left transition-transform duration-300 hover:translate-x-1"
                style={{ animationDelay: `${index * 90}ms`, opacity: 0 }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white">
                  <feature.icon className="h-4 w-4" />
                </div>
                <span className="text-sm text-white/95">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-sm text-white/70">
          Built for Indian creators
        </p>
      </div>

      <div className="w-full lg:w-[52%] flex items-start lg:items-center justify-center px-4 pb-6 pt-5 sm:px-6 sm:pb-8 sm:pt-7 lg:p-10 min-h-screen overflow-y-auto">
        <div className="surface-panel w-full max-w-[460px] px-4 py-6 sm:px-8 sm:py-10">
          <div className="lg:hidden text-center mb-6 sm:mb-8">
            <Image src="/logo-v2.png" alt="LinkMyStore" height={96} width={96} className="h-20 w-20 sm:h-24 sm:w-24 mx-auto" />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
