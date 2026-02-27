'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { Plus, X, Upload, FileText, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react'
import { MAX_IMAGES_PER_PRODUCT, MAX_IMAGE_SIZE_MB } from '@/lib/constants'

interface TemplateItem {
    file: File
    name: string
    category: string
}

interface TemplateLibraryFormProps {
    title: string
    setTitle: (v: string) => void
    description: string
    setDescription: (v: string) => void
    price: string
    setPrice: (v: string) => void
    comparePrice: string
    setComparePrice: (v: string) => void
    templates: TemplateItem[]
    setTemplates: (v: TemplateItem[]) => void
    images: File[]
    setImages: (v: File[]) => void
    imagePreviews: string[]
    setImagePreviews: (v: string[]) => void
    onGenerateAI: () => void
    aiLoading: boolean
}

export default function TemplateLibraryForm({
    title, setTitle,
    description, setDescription,
    price, setPrice,
    comparePrice, setComparePrice,
    templates, setTemplates,
    images, setImages,
    imagePreviews, setImagePreviews,
    onGenerateAI, aiLoading,
}: TemplateLibraryFormProps) {
    const templateInputRef = useRef<HTMLInputElement>(null)
    const imageInputRef = useRef<HTMLInputElement>(null)

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        const newTemplates = files.map(f => ({
            file: f,
            name: f.name.replace(/\.[^/.]+$/, ''),
            category: '',
        }))
        setTemplates([...templates, ...newTemplates])
        if (templateInputRef.current) templateInputRef.current.value = ''
    }

    const updateTemplate = (i: number, field: 'name' | 'category', value: string) => {
        setTemplates(templates.map((t, idx) => idx === i ? { ...t, [field]: value } : t))
    }

    const removeTemplate = (i: number) => {
        setTemplates(templates.filter((_, idx) => idx !== i))
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
            {/* Details */}
            <div className="card animate-in">
                <h2 className="text-lg font-semibold mb-4">Template Library Details</h2>
                <div>
                    <label className="block text-sm font-medium mb-1.5">Title <span className="text-red-500">*</span></label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Instagram Story Templates Pack" className="input-field" />
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
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What templates are included? What tools/apps do they work with?" rows={3} className="input-field resize-none" />
                </div>
            </div>

            {/* Cover Image */}
            <div className="card animate-in-delay-1">
                <h2 className="text-lg font-semibold mb-4">Cover Image</h2>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {imagePreviews.map((preview, i) => (
                        <div key={i} className="w-full aspect-square rounded-xl border border-gray-200 relative overflow-hidden">
                            <Image src={preview} alt="" width={400} height={400} unoptimized className="w-full h-full object-cover" />
                            <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"><X className="w-3 h-3" /></button>
                        </div>
                    ))}
                    {images.length < MAX_IMAGES_PER_PRODUCT && (
                        <button onClick={() => imageInputRef.current?.click()} className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-400 flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-50">
                            <Plus className="w-6 h-6 text-gray-400" /><span className="text-xs text-gray-500 mt-1">Add</span>
                        </button>
                    )}
                </div>
                <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
            </div>

            {/* Templates */}
            <div className="card animate-in-delay-2">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-semibold">
                            Template Files <span className="text-red-500">*</span>
                        </h2>
                        <p className="text-sm text-gray-500">
                            {templates.length} template{templates.length !== 1 ? 's' : ''} added — Required
                        </p>
                    </div>
                </div>

                {templates.length > 0 && (
                    <div className="space-y-2 mb-4">
                        {templates.map((t, i) => (
                            <div key={i} className="border border-gray-200 rounded-xl p-3">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                        {t.file.type.startsWith('image/') ? (
                                            <ImageIcon className="w-4 h-4 text-indigo-500" />
                                        ) : (
                                            <FileText className="w-4 h-4 text-indigo-500" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <input
                                            type="text"
                                            value={t.name}
                                            onChange={(e) => updateTemplate(i, 'name', e.target.value)}
                                            placeholder="Template name"
                                            className="text-sm font-medium outline-none bg-transparent w-full"
                                        />
                                        <div className="text-[10px] text-gray-400">{formatFileSize(t.file.size)}</div>
                                    </div>
                                    <button onClick={() => removeTemplate(i)} className="text-red-400 hover:text-red-600 p-1"><X className="w-3.5 h-3.5" /></button>
                                </div>
                                <input
                                    type="text"
                                    value={t.category}
                                    onChange={(e) => updateTemplate(i, 'category', e.target.value)}
                                    placeholder="Category (e.g., Instagram, Canva)"
                                    className="input-field text-xs py-1.5"
                                />
                            </div>
                        ))}
                    </div>
                )}

                <button onClick={() => templateInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 transition-colors">
                    <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                    <div className="text-sm text-gray-600">Upload templates (bulk upload supported)</div>
                    <div className="text-xs text-gray-400 mt-1">Images, PSD, AI, Canva exports, etc.</div>
                </button>
                <input ref={templateInputRef} type="file" multiple onChange={handleTemplateUpload} className="hidden" />
            </div>

            {/* Pricing */}
            <div className="card animate-in-delay-3">
                <h2 className="text-lg font-semibold mb-4">Pricing</h2>
                <div>
                    <label className="block text-sm font-medium mb-1.5">Price <span className="text-red-500">*</span></label>
                    <div className="flex">
                        <span className="bg-gray-50 px-4 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500 font-semibold">₹</span>
                        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="299" min="1" className="input-field rounded-l-none" />
                    </div>
                </div>
                <div className="mt-4">
                    <label className="block text-sm font-medium mb-1.5">Compare at Price <span className="text-gray-400 font-normal">(optional)</span></label>
                    <div className="flex">
                        <span className="bg-gray-50 px-4 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500 font-semibold">₹</span>
                        <input type="number" value={comparePrice} onChange={(e) => setComparePrice(e.target.value)} placeholder="599" min="0" className="input-field rounded-l-none" />
                    </div>
                </div>
            </div>
        </div>
    )
}
