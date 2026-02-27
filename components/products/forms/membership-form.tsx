'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { Plus, X, Upload, FileText, Loader2, Sparkles } from 'lucide-react'
import { MAX_IMAGES_PER_PRODUCT, MAX_IMAGE_SIZE_MB } from '@/lib/constants'
import type { MembershipData } from '@/types'

const BILLING_PERIODS: { value: MembershipData['billing_period']; label: string }[] = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
]

interface MembershipFormProps {
    title: string
    setTitle: (v: string) => void
    description: string
    setDescription: (v: string) => void
    price: string
    setPrice: (v: string) => void
    billingPeriod: MembershipData['billing_period']
    setBillingPeriod: (v: MembershipData['billing_period']) => void
    benefits: string[]
    setBenefits: (v: string[]) => void
    images: File[]
    setImages: (v: File[]) => void
    imagePreviews: string[]
    setImagePreviews: (v: string[]) => void
    contentFiles: File[]
    setContentFiles: (v: File[]) => void
    onGenerateAI: () => void
    aiLoading: boolean
}

export default function MembershipForm({
    title, setTitle,
    description, setDescription,
    price, setPrice,
    billingPeriod, setBillingPeriod,
    benefits, setBenefits,
    images, setImages,
    imagePreviews, setImagePreviews,
    contentFiles, setContentFiles,
    onGenerateAI, aiLoading,
}: MembershipFormProps) {
    const imageInputRef = useRef<HTMLInputElement>(null)
    const contentInputRef = useRef<HTMLInputElement>(null)

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
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

    const addBenefit = () => setBenefits([...benefits, ''])
    const updateBenefit = (i: number, v: string) => setBenefits(benefits.map((b, idx) => idx === i ? v : b))
    const removeBenefit = (i: number) => setBenefits(benefits.filter((_, idx) => idx !== i))

    return (
        <div className="space-y-6">
            {/* Details */}
            <div className="card animate-in">
                <h2 className="text-lg font-semibold mb-4">Membership Details</h2>
                <div>
                    <label className="block text-sm font-medium mb-1.5">Title <span className="text-red-500">*</span></label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., VIP Creator Community" className="input-field" />
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
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What do members get?" rows={3} className="input-field resize-none" />
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
                        <button onClick={() => imageInputRef.current?.click()} className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-amber-400 flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-50">
                            <Plus className="w-6 h-6 text-gray-400" /><span className="text-xs text-gray-500 mt-1">Add</span>
                        </button>
                    )}
                </div>
                <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
            </div>

            {/* Benefits */}
            <div className="card animate-in-delay-2">
                <h2 className="text-lg font-semibold mb-1">Membership Benefits</h2>
                <p className="text-sm text-gray-500 mb-4">What do members get? List the perks.</p>
                {benefits.length > 0 && (
                    <div className="space-y-2 mb-4">
                        {benefits.map((b, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-green-500 text-sm">✓</span>
                                <input type="text" value={b} onChange={(e) => updateBenefit(i, e.target.value)} placeholder="e.g., Exclusive monthly workshop" className="input-field flex-1 py-2 text-sm" />
                                <button onClick={() => removeBenefit(i)} className="text-red-400 hover:text-red-600 p-1"><X className="w-3.5 h-3.5" /></button>
                            </div>
                        ))}
                    </div>
                )}
                <button onClick={addBenefit} className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Add Benefit</button>
            </div>

            {/* Exclusive Content */}
            <div className="card animate-in-delay-3">
                <h2 className="text-lg font-semibold mb-1">Exclusive Content <span className="text-gray-400 font-normal text-sm">(optional)</span></h2>
                <p className="text-sm text-gray-500 mb-4">Upload files that members get access to</p>
                {contentFiles.length > 0 && (
                    <div className="space-y-2 mb-4">
                        {contentFiles.map((file, i) => (
                            <div key={i} className="border border-gray-200 rounded-xl p-3 flex items-center gap-3">
                                <FileText className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{file.name}</div>
                                    <div className="text-xs text-gray-400">{formatFileSize(file.size)}</div>
                                </div>
                                <button onClick={() => setContentFiles(contentFiles.filter((_, idx) => idx !== i))} className="p-1 text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                )}
                <button onClick={() => contentInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-amber-400 transition-colors">
                    <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                    <div className="text-sm text-gray-600">Upload exclusive content</div>
                </button>
                <input ref={contentInputRef} type="file" multiple onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    setContentFiles([...contentFiles, ...files])
                    if (contentInputRef.current) contentInputRef.current.value = ''
                }} className="hidden" />
            </div>

            {/* Pricing */}
            <div className="card animate-in-delay-4">
                <h2 className="text-lg font-semibold mb-4">Membership Pricing</h2>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Billing Period</label>
                    <div className="flex flex-wrap gap-2">
                        {BILLING_PERIODS.map(p => (
                            <button key={p.value} onClick={() => setBillingPeriod(p.value)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${billingPeriod === p.value ? 'bg-amber-100 text-amber-700 border-2 border-amber-400' : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1.5">
                        Price per {billingPeriod === 'weekly' ? 'week' : billingPeriod === 'monthly' ? 'month' : billingPeriod === 'quarterly' ? 'quarter' : 'year'} <span className="text-red-500">*</span>
                    </label>
                    <div className="flex">
                        <span className="bg-gray-50 px-4 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500 font-semibold">₹</span>
                        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="499" min="1" className="input-field rounded-l-none" />
                    </div>
                </div>
            </div>
        </div>
    )
}
