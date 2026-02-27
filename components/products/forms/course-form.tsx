'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Plus, X, GripVertical, ChevronDown, ChevronRight, Video, FileText, File, Loader2, Sparkles, Eye } from 'lucide-react'
import { MAX_IMAGES_PER_PRODUCT, MAX_IMAGE_SIZE_MB } from '@/lib/constants'
import type { CourseModule, CourseLesson } from '@/types'

function generateId() {
    return Math.random().toString(36).slice(2, 10)
}

interface CourseFormProps {
    title: string
    setTitle: (v: string) => void
    description: string
    setDescription: (v: string) => void
    price: string
    setPrice: (v: string) => void
    comparePrice: string
    setComparePrice: (v: string) => void
    modules: CourseModule[]
    setModules: (v: CourseModule[]) => void
    dripEnabled: boolean
    setDripEnabled: (v: boolean) => void
    dripIntervalDays: string
    setDripIntervalDays: (v: string) => void
    images: File[]
    setImages: (v: File[]) => void
    imagePreviews: string[]
    setImagePreviews: (v: string[]) => void
    onGenerateAI: () => void
    aiLoading: boolean
}

export default function CourseForm({
    title, setTitle,
    description, setDescription,
    price, setPrice,
    comparePrice, setComparePrice,
    modules, setModules,
    dripEnabled, setDripEnabled,
    dripIntervalDays, setDripIntervalDays,
    images, setImages,
    imagePreviews, setImagePreviews,
    onGenerateAI, aiLoading,
}: CourseFormProps) {
    const imageInputRef = useRef<HTMLInputElement>(null)
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())

    const toggleModuleExpand = (moduleId: string) => {
        const next = new Set(expandedModules)
        if (next.has(moduleId)) next.delete(moduleId)
        else next.add(moduleId)
        setExpandedModules(next)
    }

    const addModule = () => {
        const id = generateId()
        setModules([...modules, { id, title: '', sort_order: modules.length, lessons: [] }])
        setExpandedModules(prev => new Set(prev).add(id))
    }

    const updateModule = (moduleId: string, field: keyof CourseModule, value: CourseModule[keyof CourseModule]) => {
        setModules(modules.map(m => m.id === moduleId ? { ...m, [field]: value } : m))
    }

    const removeModule = (moduleId: string) => {
        if (!window.confirm('Delete this module and all its lessons?')) return
        setModules(modules.filter(m => m.id !== moduleId))
    }

    const addLesson = (moduleId: string) => {
        const lessonId = generateId()
        setModules(modules.map(m => {
            if (m.id !== moduleId) return m
            return {
                ...m,
                lessons: [...m.lessons, {
                    id: lessonId,
                    title: '',
                    content_type: 'video' as const,
                    sort_order: m.lessons.length,
                }]
            }
        }))
    }

    const updateLesson = (moduleId: string, lessonId: string, field: keyof CourseLesson, value: CourseLesson[keyof CourseLesson]) => {
        setModules(modules.map(m => {
            if (m.id !== moduleId) return m
            return {
                ...m,
                lessons: m.lessons.map(l => l.id === lessonId ? { ...l, [field]: value } : l)
            }
        }))
    }

    const removeLesson = (moduleId: string, lessonId: string) => {
        setModules(modules.map(m => {
            if (m.id !== moduleId) return m
            return { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) }
        }))
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

    const removeImage = (index: number) => {
        URL.revokeObjectURL(imagePreviews[index])
        setImages(images.filter((_, i) => i !== index))
        setImagePreviews(imagePreviews.filter((_, i) => i !== index))
    }

    const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0)

    return (
        <div className="space-y-6">
            {/* Course Details */}
            <div className="card animate-in">
                <h2 className="text-lg font-semibold mb-4">Course Details</h2>
                <div>
                    <label className="block text-sm font-medium mb-1.5">
                        Course Title <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Master Instagram Marketing"
                        className="input-field"
                    />
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
                        placeholder="What will students learn? What's included?"
                        rows={4}
                        className="input-field resize-none"
                    />
                </div>
            </div>

            {/* Cover Image */}
            <div className="card animate-in-delay-1">
                <h2 className="text-lg font-semibold mb-1">Course Cover Image</h2>
                <p className="text-sm text-gray-500 mb-4">An attractive cover image to represent your course</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {imagePreviews.map((preview, i) => (
                        <div key={i} className="w-full aspect-square rounded-xl border border-gray-200 relative overflow-hidden">
                            <Image src={preview} alt="" width={400} height={400} unoptimized className="w-full h-full object-cover" />
                            <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
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

            {/* Course Builder */}
            <div className="card animate-in-delay-2">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-semibold">Course Content</h2>
                        <p className="text-xs text-[#8E8E9F] mt-0.5">
                            {modules.length} module{modules.length !== 1 ? 's' : ''} · {totalLessons} lesson{totalLessons !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                {modules.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <GripVertical className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No modules yet. Add your first module to get started.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {modules.map((module, mIndex) => {
                            const isExpanded = expandedModules.has(module.id)
                            return (
                                <div key={module.id} className="border border-gray-200 rounded-xl overflow-hidden">
                                    {/* Module Header */}
                                    <div className="bg-gray-50 px-4 py-3 flex items-center gap-3">
                                        <button onClick={() => toggleModuleExpand(module.id)} className="text-gray-400 hover:text-gray-600">
                                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </button>
                                        <span className="text-xs font-bold text-[#8E8E9F] w-6">M{mIndex + 1}</span>
                                        <input
                                            type="text"
                                            value={module.title}
                                            onChange={(e) => updateModule(module.id, 'title', e.target.value)}
                                            placeholder="Module title..."
                                            className="flex-1 bg-transparent text-sm font-medium outline-none"
                                        />
                                        <span className="text-[10px] text-[#8E8E9F]">{module.lessons.length} lessons</span>
                                        <button onClick={() => removeModule(module.id)} className="text-red-400 hover:text-red-600 p-1">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Lessons */}
                                    {isExpanded && (
                                        <div className="p-3 space-y-2">
                                            {module.lessons.map((lesson, lIndex) => (
                                                <div key={lesson.id} className="bg-white border border-gray-100 rounded-lg p-3">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-[10px] font-bold text-[#C4B5E0] bg-purple-50 px-1.5 py-0.5 rounded">
                                                            L{lIndex + 1}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={lesson.title}
                                                            onChange={(e) => updateLesson(module.id, lesson.id, 'title', e.target.value)}
                                                            placeholder="Lesson title..."
                                                            className="flex-1 text-sm outline-none bg-transparent"
                                                        />
                                                        <label className="flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={lesson.is_preview || false}
                                                                onChange={(e) => updateLesson(module.id, lesson.id, 'is_preview', e.target.checked)}
                                                                className="w-3 h-3 rounded"
                                                            />
                                                            <Eye className="w-3 h-3" /> Preview
                                                        </label>
                                                        <button onClick={() => removeLesson(module.id, lesson.id)} className="text-red-400 hover:text-red-600 p-0.5">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>

                                                    {/* Content Type Tabs */}
                                                    <div className="flex gap-1 mb-2">
                                                        {(['video', 'text', 'file'] as const).map(ct => (
                                                            <button
                                                                key={ct}
                                                                onClick={() => updateLesson(module.id, lesson.id, 'content_type', ct)}
                                                                className={`text-[10px] font-medium px-2 py-1 rounded-md transition-colors ${lesson.content_type === ct
                                                                        ? 'bg-purple-100 text-purple-700'
                                                                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                                                    }`}
                                                            >
                                                                {ct === 'video' && <><Video className="w-3 h-3 inline mr-0.5" /> Video</>}
                                                                {ct === 'text' && <><FileText className="w-3 h-3 inline mr-0.5" /> Text</>}
                                                                {ct === 'file' && <><File className="w-3 h-3 inline mr-0.5" /> File</>}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* Content Input */}
                                                    {lesson.content_type === 'video' && (
                                                        <input
                                                            type="url"
                                                            value={lesson.video_url || ''}
                                                            onChange={(e) => updateLesson(module.id, lesson.id, 'video_url', e.target.value)}
                                                            placeholder="YouTube or Vimeo URL..."
                                                            className="input-field text-xs py-2"
                                                        />
                                                    )}
                                                    {lesson.content_type === 'text' && (
                                                        <textarea
                                                            value={lesson.text_content || ''}
                                                            onChange={(e) => updateLesson(module.id, lesson.id, 'text_content', e.target.value)}
                                                            placeholder="Write lesson content..."
                                                            rows={3}
                                                            className="input-field text-xs py-2 resize-none"
                                                        />
                                                    )}
                                                    {lesson.content_type === 'file' && (
                                                        <input
                                                            type="text"
                                                            value={lesson.file_url || ''}
                                                            onChange={(e) => updateLesson(module.id, lesson.id, 'file_url', e.target.value)}
                                                            placeholder="File URL (uploaded separately)..."
                                                            className="input-field text-xs py-2"
                                                        />
                                                    )}

                                                    {/* Duration */}
                                                    <div className="mt-2">
                                                        <input
                                                            type="number"
                                                            value={lesson.duration_minutes || ''}
                                                            onChange={(e) => updateLesson(module.id, lesson.id, 'duration_minutes', parseInt(e.target.value) || undefined)}
                                                            placeholder="Duration (minutes)"
                                                            className="input-field text-xs py-2 w-40"
                                                            min="1"
                                                        />
                                                    </div>
                                                </div>
                                            ))}

                                            <button
                                                onClick={() => addLesson(module.id)}
                                                className="w-full border border-dashed border-gray-200 rounded-lg py-2 text-xs text-gray-400 hover:text-purple-500 hover:border-purple-300 transition-colors flex items-center justify-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" /> Add Lesson
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                <button
                    onClick={addModule}
                    className="btn-secondary text-sm py-2 px-4 mt-4 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add Module
                </button>

                {/* Drip Content */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold">Drip Content</h3>
                            <p className="text-xs text-gray-400">Release lessons gradually over time</p>
                        </div>
                        <button
                            onClick={() => setDripEnabled(!dripEnabled)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${dripEnabled ? 'bg-purple-500' : 'bg-gray-300'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${dripEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>
                    {dripEnabled && (
                        <div className="mt-3">
                            <label className="text-xs text-[#8E8E9F] mb-1 block">Days between module releases</label>
                            <input
                                type="number"
                                value={dripIntervalDays}
                                onChange={(e) => setDripIntervalDays(e.target.value)}
                                placeholder="7"
                                min="1"
                                className="input-field text-sm w-32"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Pricing */}
            <div className="card animate-in-delay-3">
                <h2 className="text-lg font-semibold mb-4">Course Pricing</h2>
                <div>
                    <label className="block text-sm font-medium mb-1.5">Price <span className="text-red-500">*</span></label>
                    <div className="flex">
                        <span className="bg-gray-50 px-4 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500 font-semibold">₹</span>
                        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="999" min="1" className="input-field rounded-l-none" />
                    </div>
                </div>
                <div className="mt-4">
                    <label className="block text-sm font-medium mb-1.5">Compare at Price <span className="text-gray-400 font-normal">(optional)</span></label>
                    <div className="flex">
                        <span className="bg-gray-50 px-4 py-3 rounded-l-xl border border-r-0 border-gray-200 text-gray-500 font-semibold">₹</span>
                        <input type="number" value={comparePrice} onChange={(e) => setComparePrice(e.target.value)} placeholder="1999" min="0" className="input-field rounded-l-none" />
                    </div>
                </div>
            </div>
        </div>
    )
}
