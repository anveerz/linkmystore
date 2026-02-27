import Image from 'next/image'

interface ProductImageProps {
  src?: string
  alt: string
  priority?: boolean
}

export function ProductImage({ src, alt, priority = false }: ProductImageProps) {
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100">
        <span className="text-4xl" aria-hidden="true">📦</span>
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover"
      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
      priority={priority}
    />
  )
}
