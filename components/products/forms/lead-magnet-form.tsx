'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { Upload, FileText, X, Plus, Loader2, Sparkles } from 'lucide-react'
import { MAX_DIGITAL_FILE_SIZE_MB, MAX_IMAGES_PER_PRODUCT, MAX_IMAGE_SIZE_MB } from '@/lib/constants'

interface LeadMagnetFormProps {
    title: string
    setTitle: (v: string) => void
    description: string
    setDescription: (v: string) => void
    digitalFiles: File[]
    setDigitalFiles: (v: File[]) => void
    images: File[]
    setImages: (v: File[]) => void
    imagePreviews: string[]
    setImagePreviews: (v: string[]) => void
    onGenerateAI: () => void
    aiLoading: boolean
}

export default function LeadMagnetForm({
    title, setTitle,
    description, setDescription,
    digitalFiles, setDigitalFiles,
    images, setImages,
    imagePreviews, setImagePreviews,
    onGenerateAI, aiLoading,
}: LeadMagnetFormProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const imageInputRef = useRef<HTMLInputElement>(null)

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        for (const file of files) {
            if (file.size > MAX_DIGITAL_FILE_SIZE_MB * 1024 * 1024) {
                alert(`File exceeds ${MAX_DIGITAL_FILE_SIZE_MB}MB limit`)
                continue
            }
            setDigitalFiles([...digitalFiles, file])
        }
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (images.length + files.length > MAX_IMAGES_PER_PRODUCT) return
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

    const removeImage = (i: number) => {
        URL.revokeObjectURL(imagePreviews[i])
        setImages(images.filter((_, idx) => idx !== i))
        setImagePreviews(imagePreviews.filter((_, idx) => idx !== i))
    }

    return (
        <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-2xl p-4 animate-in">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">🧲</span>
                    <div>
                        <h3 className="text-sm font-semibold text-pink-800">Lead Magnet — Free Product</h3>
                        <p className="text-xs text-pink-600 mt-1">
                            This product is free! Customers will give their name & email to download it.
                            Great for building your audience and email list.
                        </p>
                    </div>
                </div>
            </div>

            {/* Details */}
            <div className="card animate-in-delay-1">
                <h2 className="text-lg font-semibold mb-4">Lead Magnet Details</h2>
                <div>
                    <label className="block text-sm font-medium mb-1.5">Title <span className="text-red-500">*</span></label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Free Social Media Calendar 2026" className="input-field" />
                </div>
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
                            {aiLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</> : <><Sparkles className="w-3.5 h-3.5" /> Generate with AI</>}
                        </button>
                    </div>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will they get? Why should they download it?" rows={3} className="input-field resize-none" />
                </div>
            </div>

            {/* Cover Image */}
            <div className="card animate-in-delay-2">
                <h2 className="text-lg font-semibold mb-1">Cover Image</h2>
                <p className="text-sm text-gray-500 mb-4">An eye-catching preview image</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {imagePreviews.map((preview, i) => (
                        <div key={i} className="w-full aspect-square rounded-xl border border-gray-200 relative overflow-hidden">
                            <Image src={preview} alt="" width={400} height={400} unoptimized className="w-full h-full object-cover" />
                            <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"><X className="w-3 h-3" /></button>
                        </div>
                    ))}
                    {images.length < MAX_IMAGES_PER_PRODUCT && (
                        <button onClick={() => imageInputRef.current?.click()} className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-pink-400 flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-50">
                            <Plus className="w-6 h-6 text-gray-400" />
                            <span className="text-xs text-gray-500 mt-1">Add</span>
                        </button>
                    )}
                </div>
                <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
            </div>

            {/* Freebie File */}
            <div className="card animate-in-delay-3">
                <h2 className="text-lg font-semibold mb-1">
                    Free Download File <span className="text-red-500">*</span>
                </h2>
                <p className="text-sm text-gray-500 mb-4">The file that will be sent after email capture — Required</p>
                {digitalFiles.length > 0 && (
                    <div className="space-y-2 mb-4">
                        {digitalFiles.map((file, i) => (
                            <div key={i} className="border border-gray-200 rounded-xl p-3 flex items-center gap-3">
                                <FileText className="w-5 h-5 text-pink-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{file.name}</div>
                                    <div className="text-xs text-gray-400">{formatFileSize(file.size)}</div>
                                </div>
                                <button onClick={() => setDigitalFiles(digitalFiles.filter((_, idx) => idx !== i))} className="p-1 text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                )}
                <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-pink-400 transition-colors">
                    <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                    <div className="text-sm text-gray-600">Upload your freebie</div>
                    <div className="text-xs text-gray-400 mt-1">PDF, ZIP, images — up to {MAX_DIGITAL_FILE_SIZE_MB}MB</div>
                </button>
                <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
            </div>

            {/* Price Info */}
            <div className="card bg-green-50 border-green-200 animate-in-delay-4">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🎁</span>
                    <div>
                        <div className="text-sm font-semibold text-green-800">Price: FREE (₹0)</div>
                        <div className="text-xs text-green-600">Customers will provide their name & email to download</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
