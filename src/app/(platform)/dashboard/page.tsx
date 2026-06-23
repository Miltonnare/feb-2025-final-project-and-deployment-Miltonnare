import { redirect } from "next/navigation"
import Link from "next/link"
import { auth, signOut } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deletePost } from "@/features/posts/actions"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  FileText,
  Eye,
  Heart,
  Users,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  LogOut,
  User as UserIcon,
  BookOpen,
  Sparkles,
} from "lucide-react"

export const metadata = {
  title: "Dashboard",
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const userId = session.user.id

  // 1. Fetch User Profile
  const profile = await prisma.profile.findUnique({
    where: { userId },
  })

  // 2. Fetch User Posts
  const posts = await prisma.post.findMany({
    where: { authorId: userId },
    include: {
      category: true,
      reactions: {
        where: { type: "CLAP" },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // 3. Fetch Follower Count
  const followerCount = await prisma.follow.count({
    where: { followingId: userId },
  })

  // 4. Calculate Stats
  const totalViews = posts.reduce((sum, p) => sum + p.viewCount, 0)
  const totalClaps = posts.reduce((sum, p) => {
    const claps = p.reactions.reduce((s, r) => s + r.count, 0)
    return sum + claps
  }, 0)
  
  // Simulated revenue (e.g. $0.01 per view on premium posts, and $0.05 per clap)
  const premiumViews = posts.filter(p => p.isPremium).reduce((sum, p) => sum + p.viewCount, 0)
  const estimatedEarnings = (premiumViews * 0.02 + totalClaps * 0.05).toFixed(2)

  const publishedPosts = posts.filter(p => p.published)
  const draftPosts = posts.filter(p => !p.published)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Dashboard Nav */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand-500" />
          <span className="font-display font-bold text-slate-900 dark:text-white">
            theeBloggers Workspace
          </span>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-4">
            <div className="w-8 h-8 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm">
              {session.user.name?.[0] || "U"}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {session.user.name || "Creator"}
              </p>
              <p className="text-[10px] text-slate-400 capitalize">
                {(session.user as any).role || "Author"}
              </p>
            </div>
          </div>
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/login" })
            }}
          >
            <button
              type="submit"
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </nav>

      {/* Workspace Dashboard Layout */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-brand-500/5 to-violet-500/5 border border-brand-500/10 dark:border-brand-500/5 rounded-2xl p-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-950 dark:text-white">
              Hello, {session.user.name || "Creator"}!
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Your platform metrics are up to date. Keep writing stories that matter.
            </p>
          </div>
          <Link
            href="/editor"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium text-sm transition-all shadow-md shadow-brand-500/10 hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Article</span>
          </Link>
        </div>

        {/* Analytics Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Articles</span>
              <FileText className="w-5 h-5 text-brand-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
              {posts.length}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              {publishedPosts.length} Published · {draftPosts.length} Drafts
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Page Reads</span>
              <Eye className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
              {totalViews}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Across all publications</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Claps</span>
              <Heart className="w-5 h-5 text-pink-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
              {totalClaps}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Reader appreciations</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Stripe Revenue</span>
              <DollarSign className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
              ${estimatedEarnings}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Simulated SaaS payouts</span>
            </p>
          </div>
        </div>

        {/* Content Manager Tabs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6">
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mb-6">
            Article Manager
          </h3>

          <div className="space-y-6">
            {posts.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No articles written yet
                </p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Get started by writing your first article inside our Notion workspace.
                </p>
                <Link
                  href="/editor"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium text-xs transition-colors"
                >
                  Create Article
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {posts.map(post => (
                  <div
                    key={post.id}
                    className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-slate-900 dark:text-white hover:underline">
                          <Link href={post.published ? `/posts/${post.slug}` : `/editor/${post.id}`}>
                            {post.title}
                          </Link>
                        </h4>
                        {!post.published && (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-500 rounded-full border border-slate-200 dark:border-slate-700/50">
                            Draft
                          </span>
                        )}
                        {post.isPremium && (
                          <span className="px-2 py-0.5 bg-amber-500/10 text-[10px] font-bold text-amber-600 dark:text-amber-500 rounded-full border border-amber-500/20">
                            Premium
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                        <span>{post.category?.name || "Uncategorized"}</span>
                        <span>·</span>
                        <span>{post.estimatedReadTime} min read</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {post.viewCount} reads
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Link
                        href={`/editor/${post.id}`}
                        className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                        title="Edit Article"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>

                      <form
                        action={async () => {
                          "use server"
                          await deletePost(post.id)
                        }}
                      >
                        <button
                          type="submit"
                          className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-200 dark:hover:border-red-800/30 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete Article"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
