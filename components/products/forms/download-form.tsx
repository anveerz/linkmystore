'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { Upload, FileText, X, Plus, Loader2, Sparkles } from 'lucide-react'
import { MAX_DIGITAL_FILE_SIZE_MB, MAX_IMAGES_PER_PRODUCT, MAX_IMAGE_SIZE_MB } from '@/lib/constants'

interface DownloadFormProps {
    title: string
    setTitle: (v: string) => void
    description: string
    setDescription: (v: string) => void
    price: string
    setPrice: (v: string) => void
    comparePrice: string
    setComparePrice: (v: string) => void
    digitalFiles: File[]
    setDigitalFiles: (v: File[]) => void
    images: File[]
    setImages: (v: File[]) => void
    imagePreviews: string[]
    setImagePreviews: (v: string[]) => void
    category: string
    setCategory: (v: string) => void
    onGenerateAI: () => void
    aiLoading: boolean
}

export default function DownloadForm({
    title, setTitle,
    description, setDescription,
    price, setPrice,
    comparePrice, setComparePrice,
    digitalFiles, setDigitalFiles,
    images, setImages,
    imagePreviews, setImagePreviews,
    category, setCategory,
    onGenerateAI, aiLoading,
}: DownloadFormProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const imageInputRef = useRef<HTMLInputElement>(null)

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    const handleDigitalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        for (const file of files) {
            if (file.size > MAX_DIGITAL_FILE_SIZE_MB * 1024 * 1024) {
                alert(`File "${file.name}" exceeds ${MAX_DIGITAL_FILE_SIZE_MB}MB limit`)
                continue
            }
            setDigitalFiles([...digitalFiles, file])
        }
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const removeDigitalFile = (index: number) => {
        setDigitalFiles(digitalFiles.filter((_, i) => i !== index))
    }

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (images.length + files.length > MAX_IMAGES_PER_PRODUCT) {
            alert(`Maximum ${MAX_IMAGES_PER_PRODUCT} images allowed`)
            return
        }
        const newImages = [...images]
        const newPreviews = [...imagePreviews]
        for (const file of files) {
            if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) continue
            newImages.push(file)
            newPreviews.push(URL.createObjectURL(file))
        }
        setImages(newImages)
        setImagePreviews(newPreviews)
        if (imageInputRef.current) imageInputRef.current.value = ''
    }

    const removeImage = (index: number) => {
        URL.revokeObjectURL(imagePreviews[index])
        setImages(images.filter((_, i) => i !== index))
        setImagePreviews(imagePreviews.filter((_, i) => i !== index))
    }

    return (
        <div className="space-y-6">
            {/* Title */}
            <div className="card animate-in">
                <h2 className="text-lg font-semibold mb-4">Product Details</h2>
                <div>
                    <label className="block text-sm font-medium mb-1.5">
                        Title <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Instagram Reels Template Pack"
                        className="input-field"
                    />
                </div>

                {/* Description with AI */}
                <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm font-medium">Description</label>
                        <button
                            onClick={onGenerateAI}
                            disabled={aiLoading || !title.trim()}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                                background: aiLoading || !title.trim() ? undefined : 'linear-gradient(135deg, #E8651A 0%, #3D2176 100%)',
                                color: aiLoading || !title.trim() ? undefined : 'white',
                                border: aiLoading || !title.trim() ? '1px solid #e5e7eb' : 'none',
                            }}
                        >
                            {aiLoading ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                            ) : (
                                <><Sparkles className="w-3.5 h-3.5" /> Generate with AI</>
                            )}
                        </button>
                    </div>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what's included in this download..."
                        rows={4}
                        className="input-field resize-none"
                    />
                </div>

                {/* Category */}
                <div className="mt-4">
                    <label className="block text-sm font-medium mb-1.5">Category</label>
                    <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="e.g., Templates & Presets"
                        className="input-field"
                    />
                </div>
            </div>

            {/* Cover Image */}
            <div className="card animate-in-delay-1">
                <h2 className="text-lg font-semibold mb-1">Cover Image</h2>
                <p className="text-sm text-gray-500 mb-4">Upload a preview image for your product</p>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {imagePreviews.map((preview, i) => (
                        <div key={i} className="w-full aspect-square rounded-xl border border-gray-200 relative overflow-hidden">
                            <Image src={preview} alt={`Preview ${i + 1}`} width={400} height={400} unoptimized className="w-full h-full object-cover" />
                            <button
                                onClick={() => removeImage(i)}
                                className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    {images.length < MAX_IMAGES_PER_PRODUCT && (
                        <button
                            onClick={() => imageInputRef.current?.click()}
                            className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-orange-400 flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-50"
                        >
                            <Plus className="w-6 h-6 text-gray-400" />
                            <span className="text-xs text-gray-500 mt-1">Add</span>
                        </button>
                    )}
                </div>
                <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
            </div>

            {/* Digital Files */}
            <div className="card animate-in-delay-2">
                <h2 className="text-lg font-semibold mb-1">
                    Digital Files <span className="text-red-500">*</span>
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                    Upload files to be delivered after purchase (PDF, ZIP, images, etc.) — Required
                </p>

                {digitalFiles.length > 0 && (
                    <div className="space-y-2 mb-4">
                        {digitalFiles.map((file, i) => (
                            <div key={i} className="border border-gray-200 rounded-xl p-3 flex items-center gap-3">
                                <FileText className="w-5 h-5 text-orange-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{file.name}</div>
                                    <div className="text-xs text-gray-400">{formatFileSize(file.size)}</div>
                                </div>
                                <button onClick={() => removeDigitalFile(i)} className="p-1 text-red-400 hover:text-red-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-orange-400 transition-colors"
                >
                    <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                    <div className="text-sm text-gray-600">Click to upload files</div>
                    <div className="text-xs text-gray-400 mt-1">PDF, ZIP, images — up to {MAX_DIGITAL_FILE_SIZE_MB}MB each</div>
                </button>
                <input ref={fileInputRef} type="file" multiple onChange={handleDigitalFileSelect} className="hidden" />
            </div>

            {/* Pricing */}
            <div className="card animate-in-delay-3">
                <h2 className="text-lg font-semibold mb-4">Pricing</h2>
                <div>
                    <label className="block text-sm font-medium mb-1.5">
                        Price <span className="text-red-500">*</span>
                    </label>
                    <div className="flex">
                        <span className="bg-gray-50 px-4 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500 font-semibold">₹</span>
                        <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="499"
                            min="1"
                            className="input-field rounded-l-none"
                        />
                    </div>
                </div>
                <div className="mt-4">
                    <label className="block text-sm font-medium mb-1.5">
                        Compare at Price <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <div className="flex">
                        <span className="bg-gray-50 px-4 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500 font-semibold">₹</span>
                        <input
                            type="number"
                            value={comparePrice}
                            onChange={(e) => setComparePrice(e.target.value)}
                            placeholder="699"
                            min="0"
                            className="input-field rounded-l-none"
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Show original price with a strikethrough</p>
                </div>
            </div>
        </div>
    )
}
