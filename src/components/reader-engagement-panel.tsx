"use client"

import { useState, useTransition } from "react"
import { clapPost, toggleBookmark } from "@/features/comments/actions"
import { Heart, Bookmark, Share2, MessageSquare, Check } from "lucide-react"

interface ReaderEngagementPanelProps {
  postId: string
  slug: string
  initialClaps: number
  isBookmarked: boolean
  commentCount: number
}

export function ReaderEngagementPanel({
  postId,
  slug,
  initialClaps,
  isBookmarked: initialBookmarked,
  commentCount,
}: ReaderEngagementPanelProps) {
  const [claps, setClaps] = useState(initialClaps)
  const [userClaps, setUserClaps] = useState(0)
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [copied, setCopied] = useState(false)
  const [, startTransition] = useTransition()

  const handleClap = () => {
    if (userClaps >= 50) return
    
    // Optimistic local state update
    setClaps(prev => prev + 1)
    setUserClaps(prev => prev + 1)

    startTransition(async () => {
      try {
        const result = await clapPost(postId)
        if (result.count) {
          // Sync with server if response returns a discrepancy
        }
      } catch (err) {
        console.error("Clap failed:", err)
        setClaps(prev => prev - 1)
        setUserClaps(prev => prev - 1)
      }
    })
  }

  const handleBookmark = () => {
    const nextState = !bookmarked
    setBookmarked(nextState)

    startTransition(async () => {
      try {
        await toggleBookmark(postId)
      } catch (err) {
        console.error("Bookmark failed:", err)
        setBookmarked(!nextState)
      }
    })
  }

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/posts/${slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center justify-between border-y border-slate-200 dark:border-slate-800 py-3 my-8">
      <div className="flex items-center gap-6">
        {/* Clap Button */}
        <button
          onClick={handleClap}
          disabled={userClaps >= 50}
          className={`flex items-center gap-2 group text-sm font-medium transition-all ${
            userClaps > 0
              ? "text-pink-600 dark:text-pink-500 scale-[1.05]"
              : "text-slate-500 hover:text-pink-600 dark:hover:text-pink-500"
          }`}
          title={`Clapped ${userClaps} times (max 50)`}
        >
          <Heart className={`w-5 h-5 transition-transform ${userClaps > 0 ? "fill-pink-600 dark:fill-pink-500" : "group-hover:scale-110"}`} />
          <span>{claps} claps</span>
        </button>

        {/* Comments Link */}
        <a
          href="#comments"
          className="flex items-center gap-2 text-slate-500 hover:text-brand-500 transition-colors text-sm font-medium"
        >
          <MessageSquare className="w-5 h-5 hover:scale-110 transition-transform" />
          <span>{commentCount} comments</span>
        </a>
      </div>

      <div className="flex items-center gap-3">
        {/* Share Button */}
        <button
          onClick={handleShare}
          className="p-2 text-slate-500 hover:text-slate-850 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors"
          title="Share Article"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-500 animate-pulse" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
        </button>

        {/* Bookmark Button */}
        <button
          onClick={handleBookmark}
          className={`p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-900 ${
            bookmarked
              ? "text-brand-600 dark:text-brand-400"
              : "text-slate-500 hover:text-slate-850 dark:hover:text-white"
          }`}
          title="Bookmark Article"
        >
          <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-brand-600 dark:fill-brand-400" : ""}`} />
        </button>
      </div>
    </div>
  )
}
