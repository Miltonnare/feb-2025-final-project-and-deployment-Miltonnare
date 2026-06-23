"use client"

import { useState, useTransition } from "react"
import { createComment } from "@/features/comments/actions"
import { formatDistanceToNow } from "date-fns"
import { CornerDownRight, MessageSquare, Send, Reply } from "lucide-react"

interface Author {
  id: string
  name: string | null
  image: string | null
}

interface Comment {
  id: string
  content: string
  parentId: string | null
  createdAt: Date
  author: Author
  replies?: Comment[]
}

interface CommentSectionProps {
  postId: string
  initialComments: Comment[]
  currentUserId?: string
  currentUserName?: string
}

export function CommentSection({
  postId,
  initialComments,
  currentUserId,
  currentUserName,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [mainContent, setMainContent] = useState("")
  const [replyToId, setReplyToId] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [isPending, startTransition] = useTransition()

  // Re-build nested comments structure on state change
  const buildCommentsTree = (list: Comment[]): Comment[] => {
    const map = new Map<string, Comment & { replies: Comment[] }>()
    list.forEach(c => {
      map.set(c.id, { ...c, replies: [] })
    })

    const roots: Comment[] = []
    map.forEach(c => {
      if (c.parentId) {
        const parent = map.get(c.parentId)
        if (parent) {
          parent.replies.push(c)
        } else {
          roots.push(c) // Fallback if parent missing
        }
      } else {
        roots.push(c)
      }
    })
    return roots
  }

  const handleAddComment = (e: React.FormEvent, parentId?: string) => {
    e.preventDefault()
    const content = parentId ? replyContent : mainContent
    if (!content.trim() || !currentUserId) return

    const newCommentTemp: Comment = {
      id: `temp-${Date.now()}`,
      content: content.trim(),
      parentId: parentId || null,
      createdAt: new Date(),
      author: {
        id: currentUserId,
        name: currentUserName || "You",
        image: null,
      },
    }

    // Optimistically update list
    setComments(prev => [...prev, newCommentTemp])
    if (parentId) {
      setReplyContent("")
      setReplyToId(null)
    } else {
      setMainContent("")
    }

    startTransition(async () => {
      try {
        const result = await createComment({
          postId,
          content: content.trim(),
          parentId,
        })
        
        // Replace temp comment with actual server-persisted comment
        setComments(prev =>
          prev.map(c => (c.id === newCommentTemp.id ? (result as any) : c))
        )
      } catch (err) {
        console.error(err)
        // Rollback on error
        setComments(prev => prev.filter(c => c.id !== newCommentTemp.id))
      }
    })
  }

  const commentTree = buildCommentsTree(comments)

  // Recursive Comment Card component
  const CommentCard = ({ comment, depth = 0 }: { comment: Comment; depth: number }) => {
    const isReplying = replyToId === comment.id
    const hasReplies = comment.replies && comment.replies.length > 0

    return (
      <div className={`space-y-4 ${depth > 0 ? "ml-6 md:ml-10 border-l border-slate-150 dark:border-slate-800/80 pl-4 mt-4" : "mt-6"}`}>
        <div id={`comment-${comment.id}`} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
                {comment.author.name?.[0] || "R"}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-250">
                  {comment.author.name}
                </p>
                <p className="text-[10px] text-slate-400">
                  {formatDistanceToNow(new Date(comment.createdAt))} ago
                </p>
              </div>
            </div>

            {currentUserId && depth < 2 && ( // Limit nested replies depth to 2 to prevent UI squeezing
              <button
                onClick={() => {
                  setReplyToId(isReplying ? null : comment.id)
                  setReplyContent("")
                }}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-brand-500 transition-colors"
              >
                <Reply className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>
            )}
          </div>

          <p className="text-sm text-slate-700 dark:text-slate-300 mt-2.5 leading-relaxed break-words whitespace-pre-line">
            {comment.content}
          </p>
        </div>

        {/* Reply Editor Box */}
        {isReplying && (
          <form
            onSubmit={e => handleAddComment(e, comment.id)}
            className="flex items-center gap-2 ml-6 md:ml-10"
          >
            <CornerDownRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder={`Reply to ${comment.author.name}...`}
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-250 outline-hidden focus:ring-1 focus:ring-brand-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={!replyContent.trim() || isPending}
              className="p-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-colors disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>
        )}

        {/* Render child replies recursively */}
        {hasReplies &&
          comment.replies!.map(reply => (
            <CommentCard key={reply.id} comment={reply} depth={depth + 1} />
          ))}
      </div>
    )
  }

  return (
    <div id="comments" className="space-y-6 pt-10 border-t border-slate-200 dark:border-slate-850">
      <h3 className="font-display font-bold text-lg text-slate-950 dark:text-white flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-brand-500" />
        <span>Discussion ({comments.length})</span>
      </h3>

      {/* Main Comment Input Form */}
      {currentUserId ? (
        <form onSubmit={e => handleAddComment(e)} className="space-y-3">
          <textarea
            placeholder="What are your thoughts on this article? Add to the discussion..."
            value={mainContent}
            onChange={e => setMainContent(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-hidden focus:ring-1 focus:ring-brand-500 resize-none leading-relaxed"
          />
          <button
            type="submit"
            disabled={!mainContent.trim() || isPending}
            className="px-4 py-2 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 ml-auto disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Post Comment</span>
          </button>
        </form>
      ) : (
        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500">
            You must be{" "}
            <a href="/login" className="text-brand-500 font-semibold hover:underline">
              signed in
            </a>{" "}
            to join the discussion.
          </p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {commentTree.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-6">
            No comments yet. Be the first to start the conversation!
          </p>
        ) : (
          commentTree.map(comment => <CommentCard key={comment.id} comment={comment} depth={0} />)
        )}
      </div>
    </div>
  )
}
