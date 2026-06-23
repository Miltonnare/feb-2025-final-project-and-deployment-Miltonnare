"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { BlockEditor, Block } from "./block-editor"
import { getCategories, createPost, updatePost } from "@/features/posts/actions"
import { suggestTitles, generateExcerpt, analyzeReadability } from "@/features/editor/actions"
import { ArrowLeft, Save, Sparkles, AlertCircle, CheckCircle2, Eye, HelpCircle } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

interface EditorWorkspaceProps {
  post?: {
    id: string
    title: string
    excerpt: string
    content: string // JSON string
    categoryId: string | null
    featuredImage: string | null
    isPremium: boolean
    published: boolean
  }
}

export function EditorWorkspace({ post }: EditorWorkspaceProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  // Form states
  const [title, setTitle] = useState(post?.title || "")
  const [excerpt, setExcerpt] = useState(post?.excerpt || "")
  const [categoryId, setCategoryId] = useState(post?.categoryId || "")
  const [featuredImage, setFeaturedImage] = useState(post?.featuredImage || "")
  const [isPremium, setIsPremium] = useState(post?.isPremium || false)
  const [published, setPublished] = useState(post?.published || false)
  const [blocks, setBlocks] = useState<Block[]>([])

  // UI state
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  // AI assistant states
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [aiAnalysis, setAiAnalysis] = useState("")
  const [isAiLoading, setIsAiLoading] = useState(false)

  // Load initial blocks if editing
  useEffect(() => {
    if (post?.content) {
      try {
        setBlocks(JSON.parse(post.content))
      } catch (e) {
        console.error("Failed to parse post content blocks:", e)
      }
    }
  }, [post])

  // Load categories on mount
  useEffect(() => {
    getCategories().then(setCategories)
  }, [])

  // Auto-save draft local backup
  useEffect(() => {
    if (!title && blocks.length <= 1) return
    
    const timer = setTimeout(() => {
      const backup = { title, excerpt, categoryId, featuredImage, isPremium, blocks }
      localStorage.setItem(`editor_backup_${post?.id || "new"}`, JSON.stringify(backup))
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    }, 15000) // Auto-save draft locally every 15s

    return () => clearTimeout(timer)
  }, [title, excerpt, categoryId, featuredImage, isPremium, blocks, post])

  // Submit Handler
  const handleSave = (publishState: boolean) => {
    if (!title.trim()) {
      setErrorMsg("Title is required.")
      return
    }

    setSaveStatus("saving")
    setErrorMsg("")

    const payload = {
      title,
      excerpt: excerpt.trim() || (blocks[0]?.text?.substring(0, 160) || "No preview excerpt available."),
      content: JSON.stringify(blocks),
      categoryId: categoryId || undefined,
      featuredImage: featuredImage.trim() || undefined,
      isPremium,
      published: publishState,
    }

    startTransition(async () => {
      try {
        if (post?.id) {
          await updatePost(post.id, payload)
        } else {
          await createPost(payload)
        }
        setSaveStatus("saved")
        localStorage.removeItem(`editor_backup_${post?.id || "new"}`)
        router.push("/dashboard")
        router.refresh()
      } catch (err: any) {
        setSaveStatus("error")
        setErrorMsg(err.message || "Failed to save article.")
      }
    })
  }

  // AI Actions
  const runAiTitles = async () => {
    setIsAiLoading(true)
    setAiSuggestions([])
    try {
      const fullText = blocks.map(b => b.text).join("\n")
      const suggestions = await suggestTitles(fullText || title)
      setAiSuggestions(suggestions)
    } catch (err) {
      console.error(err)
    } finally {
      setIsAiLoading(false)
    }
  }

  const runAiExcerpt = async () => {
    setIsAiLoading(true)
    try {
      const fullText = blocks.map(b => b.text).join("\n")
      const summary = await generateExcerpt(fullText || title)
      setExcerpt(summary)
    } catch (err) {
      console.error(err)
    } finally {
      setIsAiLoading(false)
    }
  }

  const runAiReadability = async () => {
    setIsAiLoading(true)
    setAiAnalysis("")
    try {
      const fullText = blocks.map(b => b.text).join("\n")
      const analysis = await analyzeReadability(fullText)
      setAiAnalysis(analysis)
    } catch (err) {
      console.error(err)
    } finally {
      setIsAiLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col font-sans">
      {/* Editor Header Nav */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-slate-950 dark:text-white">
              {post ? "Edit Article" : "Create New Article"}
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              {saveStatus === "saving" && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Saving...</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Draft saved</span>
                </>
              )}
              {saveStatus === "idle" && <span>Autosave active</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => handleSave(false)}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Draft</span>
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-md shadow-brand-500/10 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            Publish Article
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full">
        {/* Editor Body */}
        <main className="flex-1 px-6 md:px-12 py-8 max-w-3xl border-r border-slate-100 dark:border-slate-900">
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error</p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Cover Image Upload Link */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Paste Cover Image URL (optional)..."
              value={featuredImage}
              onChange={e => setFeaturedImage(e.target.value)}
              className="w-full text-xs text-slate-500 bg-transparent border-none outline-hidden placeholder-slate-400 focus:placeholder-slate-500"
            />
            {featuredImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={featuredImage}
                alt="Cover Preview"
                className="w-full h-48 object-cover rounded-xl mt-2 border border-slate-200 dark:border-slate-800"
              />
            )}
          </div>

          {/* Title Input */}
          <input
            type="text"
            placeholder="Untitled Article"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full text-3xl md:text-4xl font-display font-bold border-none outline-hidden placeholder-slate-300 dark:placeholder-slate-800 bg-transparent text-slate-950 dark:text-white mb-4"
          />

          {/* Excerpt Input */}
          <textarea
            placeholder="Write a short excerpt for card previews..."
            value={excerpt}
            onChange={e => setExcerpt(e.target.value)}
            className="w-full text-sm text-slate-500 bg-transparent border-none outline-hidden placeholder-slate-400 focus:placeholder-slate-500 resize-none h-16 leading-relaxed mb-8 border-b border-slate-100 dark:border-slate-900 pb-4"
          />

          {/* Notion Block Editor */}
          <BlockEditor
            initialBlocks={blocks.length > 0 ? blocks : undefined}
            onChange={setBlocks}
          />
        </main>

        {/* Sidebar Settings Panel */}
        <aside className="w-full lg:w-80 p-6 space-y-8 bg-slate-50 dark:bg-slate-950 lg:sticky lg:top-20 lg:h-[calc(100vh-80px)] overflow-y-auto">
          {/* Article Settings */}
          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Article Settings
            </h2>

            {/* Category Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Category
              </label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-hidden focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Select Category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Monetization paywall */}
            <div className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Premium Article
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Only show to premium subscribers.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPremium}
                  onChange={e => setIsPremium(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500" />
              </label>
            </div>
          </div>

          {/* AI Helper Panel */}
          <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              <span>Gemini AI Assistant</span>
            </h2>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={runAiTitles}
                disabled={isAiLoading}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
              >
                <span>Suggest Title Variations</span>
                <Sparkles className="w-3 h-3 text-brand-500" />
              </button>

              <button
                onClick={runAiExcerpt}
                disabled={isAiLoading}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
              >
                <span>Generate SEO Summary</span>
                <Sparkles className="w-3 h-3 text-brand-500" />
              </button>

              <button
                onClick={runAiReadability}
                disabled={isAiLoading}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
              >
                <span>Analyze Readability</span>
                <Sparkles className="w-3 h-3 text-brand-500" />
              </button>
            </div>

            {/* AI Assistant Output Panels */}
            {isAiLoading && (
              <div className="p-4 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <span>Gemini is thinking...</span>
              </div>
            )}

            {/* Title Suggestions Output */}
            {!isAiLoading && aiSuggestions.length > 0 && (
              <div className="bg-brand-50/50 dark:bg-slate-900 border border-brand-100 dark:border-slate-800 rounded-xl p-4 space-y-2">
                <p className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                  Suggested Titles
                </p>
                <ul className="space-y-1.5">
                  {aiSuggestions.map((t, idx) => (
                    <li
                      key={idx}
                      onClick={() => setTitle(t)}
                      className="text-xs text-slate-700 dark:text-slate-300 hover:text-brand-600 cursor-pointer list-disc list-inside hover:underline"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
                <p className="text-[9px] text-slate-400">Click a title to apply it.</p>
              </div>
            )}

            {/* Readability Output */}
            {!isAiLoading && aiAnalysis && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Readability Analysis
                </p>
                <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                  {aiAnalysis}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
