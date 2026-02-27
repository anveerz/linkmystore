import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left branding panel — desktop only */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#2A1755] to-[#3D2176] p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative orange blob */}
        <div className="absolute top-20 right-[-100px] w-[300px] h-[300px] rounded-full bg-[rgba(232,101,26,0.15)] blur-3xl" />
        <div className="absolute bottom-20 left-[-50px] w-[200px] h-[200px] rounded-full bg-[rgba(232,101,26,0.1)] blur-3xl" />

        <div className="relative z-10">
          <Image src="/logo.png" alt="LinkMyStore" height={160} width={107} className="h-40 w-auto brightness-0 invert" style={{ width: 'auto' }} />
          <p className="text-lg text-[#C4B5E0] mt-4 max-w-sm leading-relaxed">
            Turn your Instagram followers into paying customers
          </p>

          <div className="mt-16 space-y-5">
            {[
              { icon: '\u26A1', text: 'Set up your store in 2 minutes' },
              { icon: '\uD83D\uDCB0', text: 'Accept UPI, Cards & Netbanking' },
              { icon: '\uD83D\uDCE6', text: 'Sell physical + digital products' },
              { icon: '\uD83D\uDE80', text: 'Free forever \u2014 just 4% per sale' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl">{f.icon}</span>
                <span className="text-[#C4B5E0] text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-[#C4B5E0]/60 relative z-10">
          Built for Indian Creators \uD83C\uDDEE\uD83C\uDDF3
        </p>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white min-h-screen">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo — hidden on desktop */}
          <div className="lg:hidden text-center mb-8">
            <Image src="/logo.png" alt="LinkMyStore" height={96} width={64} className="h-24 w-auto mx-auto" style={{ width: 'auto' }} />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}