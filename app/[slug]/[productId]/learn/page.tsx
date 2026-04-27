'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2,
  Play,
  FileText,
  BookOpen,
  Lock,
  CheckCircle2,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Download,
  Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { CourseData, CourseLesson, CourseModule } from '@/types'

export default function LearnPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const slug = params.slug as string
  const productId = params.productId as string
  const emailFromUrl = searchParams.get('email') || ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [product, setProduct] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [settings, setSettings] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [enrollment, setEnrollment] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Auth state
  const [authStep, setAuthStep] = useState<'checking' | 'enter-email' | 'enrolled' | 'not-found'>('checking')
  const [emailInput, setEmailInput] = useState(emailFromUrl)
  const [verifying, setVerifying] = useState(false)

  // Course viewing
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set())
  const [markingComplete, setMarkingComplete] = useState(false)

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, productId])

  const fetchData = async () => {
    try {
      const { data: creatorData } = await supabase
        .from('creators').select('*').eq('store_slug', slug).eq('is_active', true).single()
      if (!creatorData) { setAuthStep('not-found'); return }

      const { data: productData } = await supabase
        .from('products').select('*').eq('id', productId).eq('creator_id', creatorData.id).eq('is_active', true).single()
      if (!productData) { setAuthStep('not-found'); return }

      if (productData.digital_subtype !== 'course') {
        toast.error('This product is not a course. Redirecting to product page.')
        router.replace(`/${slug}/${productId}`)
        return
      }

      setProduct(productData)

      const { data: settingsData } = await supabase
        .from('store_settings').select('*').eq('creator_id', creatorData.id).single()
      setSettings(settingsData)

      // Auto-verify if email is in URL
      if (emailFromUrl) {
        await verifyEnrollment(emailFromUrl, productId)
      } else {
        setAuthStep('enter-email')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const verifyEnrollment = async (email: string, pid: string) => {
    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('product_id', pid)
        .eq('buyer_email', email.toLowerCase().trim())
        .single()

      if (error || !data) {
        setAuthStep('not-found')
        return
      }

      setEnrollment(data)
      setCompletedLessons(new Set(data.lessons_completed || []))
      setAuthStep('enrolled')

      // Auto-expand first module
      const courseData = (data ? product?.course_data : null) as CourseData | null
      if (courseData?.modules?.length) {
        setExpandedModules(new Set([courseData.modules[0].id]))
      }
    } catch {
      setAuthStep('not-found')
    }
  }

  const handleEmailVerify = async () => {
    if (!emailInput.includes('@')) { toast.error('Please enter a valid email'); return }
    if (!product) return
    setVerifying(true)
    await verifyEnrollment(emailInput, product.id)
    setVerifying(false)
    if (authStep === 'not-found') {
      toast.error('No enrollment found for this email. Did you purchase this course?')
    }
  }

  const courseData = product?.course_data as CourseData | null

  const isLessonUnlocked = useCallback((moduleIndex: number, lessonIndex: number): boolean => {
    if (!courseData?.drip_enabled || !enrollment) return true
    if (moduleIndex === 0 && lessonIndex === 0) return true

    const intervalDays = courseData.drip_interval_days || 1
    const enrolledAt = new Date(enrollment.enrolled_at)
    const now = new Date()
    const daysSince = Math.floor((now.getTime() - enrolledAt.getTime()) / (1000 * 60 * 60 * 24))

    // Calculate lesson sequence number (0-indexed total position)
    let totalLessons = 0
    for (let mi = 0; mi < courseData.modules.length; mi++) {
      const mod = courseData.modules[mi]
      for (let li = 0; li < mod.lessons.length; li++) {
        if (mi === moduleIndex && li === lessonIndex) {
          return daysSince >= totalLessons * intervalDays
        }
        totalLessons++
      }
    }
    return false
  }, [courseData, enrollment])

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev)
      if (next.has(moduleId)) next.delete(moduleId)
      else next.add(moduleId)
      return next
    })
  }

  const openLesson = (lesson: CourseLesson, moduleIndex: number, lessonIndex: number) => {
    if (!isLessonUnlocked(moduleIndex, lessonIndex)) {
      toast.error('This lesson is locked. Keep learning to unlock!')
      return
    }
    setActiveLesson(lesson)
  }

  const markLessonComplete = async () => {
    if (!activeLesson || !enrollment) return
    if (completedLessons.has(activeLesson.id)) return
    setMarkingComplete(true)

    try {
      const updated = [...completedLessons, activeLesson.id]
      const { error } = await supabase
        .from('course_enrollments')
        .update({ lessons_completed: updated })
        .eq('id', enrollment.id)

      if (!error) {
        setCompletedLessons(new Set(updated))
        toast.success('Lesson marked as complete! ✓')
      }
    } catch {
      toast.error('Could not update progress')
    } finally {
      setMarkingComplete(false)
    }
  }

  const totalLessons = courseData?.modules?.reduce((sum, m) => sum + m.lessons.length, 0) || 0
  const progressPct = totalLessons > 0 ? Math.round((completedLessons.size / totalLessons) * 100) : 0

  const accentColor = settings?.accent_color || '#E8651A'

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-lg mx-auto bg-white min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // ── Product not found ──────────────────────────────────────────────────────
  if (authStep === 'not-found' && !verifying) {
    if (!product) {
      return (
        <div className="max-w-lg mx-auto bg-white min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <div className="text-5xl mb-4">😕</div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Course not found</h1>
            <p className="text-gray-500 text-sm mb-6">This course is no longer available.</p>
            <Link href={`/${slug}`} className="btn-primary">Back to Store</Link>
          </div>
        </div>
      )
    }
  }

  // ── Email Verify Step ──────────────────────────────────────────────────────
  if (authStep === 'enter-email' || (authStep === 'not-found' && product)) {
    return (
      <div className="max-w-lg mx-auto bg-white min-h-screen px-4 py-12">
        <div className="text-center mb-8">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto text-3xl mb-4"
            style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #3D2176 100%)` }}
          >
            🎓
          </div>
          <h1 className="text-xl font-bold text-[#0F172A]">{product?.title}</h1>
          <p className="text-gray-500 text-sm mt-2">Enter your email to access your course</p>
        </div>

        <div className="max-w-sm mx-auto">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
            Your Email
          </label>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="your@email.com"
            className="input-field"
            onKeyDown={(e) => e.key === 'Enter' && handleEmailVerify()}
          />

          {authStep === 'not-found' && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 mt-3">
              <p className="text-sm text-red-600">No enrollment found. Please use the same email you used during checkout.</p>
            </div>
          )}

          <button
            onClick={handleEmailVerify}
            disabled={verifying || !emailInput.includes('@')}
            className="w-full py-4 rounded-2xl font-bold text-base text-white mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #3D2176 100%)` }}
          >
            {verifying ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</>
            ) : (
              '🎓 Access My Course'
            )}
          </button>

          <p className="text-xs text-gray-400 text-center mt-4">
            Don&apos;t have access?{' '}
            <Link href={`/${slug}/${productId}`} className="underline" style={{ color: accentColor }}>
              Get the course
            </Link>
          </p>
        </div>
      </div>
    )
  }

  // ── Lesson Viewer ──────────────────────────────────────────────────────────
  if (activeLesson) {
    const isCompleted = completedLessons.has(activeLesson.id)

    return (
      <div className="max-w-lg mx-auto bg-white min-h-screen">
        {/* Nav */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
          <div className="h-14 flex items-center px-4 gap-3">
            <button onClick={() => setActiveLesson(null)} className="p-2 -ml-2">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="flex-1 text-sm font-semibold line-clamp-1">{activeLesson.title}</span>
          </div>
        </div>

        <div className="pb-24">
          {/* Video */}
          {activeLesson.content_type === 'video' && activeLesson.video_url && (
            <div className="bg-black">
              {activeLesson.video_url.includes('youtube.com') || activeLesson.video_url.includes('youtu.be') ? (
                <iframe
                  src={activeLesson.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/')}
                  className="w-full aspect-video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : activeLesson.video_url.includes('vimeo.com') ? (
                <iframe
                  src={`https://player.vimeo.com/video/${activeLesson.video_url.split('/').pop()}`}
                  className="w-full aspect-video"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                />
              ) : (
                <video src={activeLesson.video_url} controls className="w-full aspect-video" />
              )}
            </div>
          )}

          {/* Text content */}
          {activeLesson.content_type === 'text' && activeLesson.text_content && (
            <div className="px-4 py-6">
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                {activeLesson.text_content}
              </div>
            </div>
          )}

          {/* File download */}
          {activeLesson.content_type === 'file' && activeLesson.file_url && (
            <div className="px-4 py-6">
              <div className="bg-gray-50 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{activeLesson.title}</p>
                  <p className="text-xs text-gray-500">Downloadable file</p>
                </div>
                <a
                  href={activeLesson.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl text-white flex-shrink-0"
                  style={{ background: accentColor }}
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              </div>
            </div>
          )}

          {/* Lesson info */}
          <div className="px-4 pt-4 pb-6">
            <h2 className="text-lg font-bold text-[#0F172A]">{activeLesson.title}</h2>
            {activeLesson.duration_minutes && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                {activeLesson.duration_minutes} minutes
              </div>
            )}
          </div>
        </div>

        {/* Mark complete button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 px-4 py-4">
          <div className="max-w-lg mx-auto">
            {isCompleted ? (
              <div className="flex items-center justify-center gap-2 py-3 text-green-600 font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                Lesson Completed
              </div>
            ) : (
              <button
                onClick={markLessonComplete}
                disabled={markingComplete}
                className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #3D2176 100%)` }}
              >
                {markingComplete ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Mark as Complete</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Course Dashboard ────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto bg-white min-h-screen pb-12">
      {/* Nav */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="h-14 flex items-center px-4">
          <Link href={`/${slug}/${productId}`} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <span className="flex-1 text-center font-semibold text-sm">My Course</span>
        </div>
      </div>

      {/* Course Header */}
      <div
        className="px-4 py-6"
        style={{ background: `linear-gradient(135deg, ${accentColor}15 0%, #3D217615 100%)` }}
      >
        <h1 className="text-xl font-bold text-[#0F172A] leading-tight">{product?.title}</h1>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-gray-600">Your Progress</span>
            <span className="text-xs font-bold" style={{ color: accentColor }}>
              {completedLessons.size} / {totalLessons} lessons
            </span>
          </div>
          <div className="h-2 bg-white rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: `linear-gradient(90deg, ${accentColor}, #3D2176)`,
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{progressPct}% complete</p>
        </div>

        {progressPct === 100 && (
          <div className="mt-3 bg-green-100 rounded-xl px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-700">Course Completed! 🎉</span>
          </div>
        )}
      </div>

      {/* Stats row */}
      {courseData && (
        <div className="grid grid-cols-3 gap-3 px-4 mt-4">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-gray-800">{courseData.modules?.length || 0}</div>
            <div className="text-xs text-gray-500">Modules</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-gray-800">{totalLessons}</div>
            <div className="text-xs text-gray-500">Lessons</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold" style={{ color: accentColor }}>{completedLessons.size}</div>
            <div className="text-xs text-gray-500">Done</div>
          </div>
        </div>
      )}

      {/* Curriculum */}
      <div className="px-4 mt-6">
        <h2 className="text-base font-bold text-[#0F172A] mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4" style={{ color: accentColor }} />
          Curriculum
        </h2>

        {courseData?.modules && courseData.modules.length > 0 ? (
          <div className="space-y-2">
            {(courseData.modules as CourseModule[]).map((mod, modIdx) => {
              const isExpanded = expandedModules.has(mod.id)
              const moduleCompleted = mod.lessons.every(l => completedLessons.has(l.id))

              return (
                <div key={mod.id} className="border border-gray-100 rounded-2xl overflow-hidden">
                  {/* Module header */}
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: moduleCompleted ? '#10b981' : `linear-gradient(135deg, ${accentColor} 0%, #3D2176 100%)` }}
                    >
                      {moduleCompleted ? '✓' : modIdx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-gray-800 line-clamp-1">{mod.title}</span>
                      <p className="text-xs text-gray-400">{mod.lessons.length} lessons</p>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </button>

                  {/* Lessons */}
                  {isExpanded && (
                    <div className="divide-y divide-gray-50">
                      {mod.lessons.map((lesson, lessonIdx) => {
                        const unlocked = isLessonUnlocked(modIdx, lessonIdx)
                        const completed = completedLessons.has(lesson.id)

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => openLesson(lesson, modIdx, lessonIdx)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                          >
                            {/* Icon */}
                            <div className="flex-shrink-0">
                              {completed ? (
                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                </div>
                              ) : !unlocked ? (
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                                </div>
                              ) : lesson.content_type === 'video' ? (
                                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                  <Play className="w-3.5 h-3.5 text-purple-600" />
                                </div>
                              ) : lesson.content_type === 'file' ? (
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                                  <BookOpen className="w-3.5 h-3.5 text-orange-600" />
                                </div>
                              )}
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm line-clamp-1 ${!unlocked ? 'text-gray-400' : 'text-gray-800 font-medium'}`}>
                                {lesson.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {lesson.is_preview && (
                                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Preview</span>
                                )}
                                {lesson.duration_minutes && (
                                  <span className="text-xs text-gray-400">{lesson.duration_minutes}m</span>
                                )}
                                {!unlocked && (
                                  <span className="text-xs text-gray-400">Locked</span>
                                )}
                              </div>
                            </div>

                            {unlocked && !completed && (
                              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No course content yet</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 mt-8 text-center">
        <p className="text-xs text-gray-300">
          Enrolled as <strong className="text-gray-400">{emailInput || emailFromUrl}</strong>
        </p>
      </div>
    </div>
  )
}
