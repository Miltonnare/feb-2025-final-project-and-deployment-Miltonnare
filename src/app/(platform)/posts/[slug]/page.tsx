import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { ReadingProgressBar } from "@/components/reading-progress-bar"
import { ReaderEngagementPanel } from "@/components/reader-engagement-panel"
import { CommentSection } from "@/components/comment-section"
import { ThemeToggle } from "@/components/theme-toggle"
import { BookOpen, Calendar, Clock, Lock, Sparkles, User as UserIcon, ArrowLeft } from "lucide-react"

interface PostPageProps {
  params: Promise<{ slug: string }>
}

// 1. Dynamic SEO Metadata Generator
export async function generateMetadata({ params }: PostPageProps) {
  const { slug } = await params
  const post = await prisma.post.findUnique({
    where: { slug },
    include: { author: true },
  })

  if (!post) return {}

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: post.canonicalUrl || `http://localhost:3000/posts/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url: `http://localhost:3000/posts/${post.slug}`,
      publishedTime: post.publishedAt?.toISOString(),
      authors: [post.author.name || "Milton Odhiambo"],
      images: post.featuredImage ? [{ url: post.featuredImage }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.featuredImage ? [post.featuredImage] : [],
    },
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params
  const session = await auth()
  
  // Fetch post details
  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      author: {
        include: { profile: true },
      },
      category: true,
      comments: {
        include: { author: true },
        orderBy: { createdAt: "asc" },
      },
      reactions: true,
    },
  })

  if (!post || !post.published) {
    notFound()
  }

  // Increment view count asynchronously
  prisma.post.update({
    where: { id: post.id },
    data: { viewCount: { increment: 1 } },
  }).catch(err => console.error("Failed to increment views:", err))

  const userId = session?.user?.id

  // Paywall checks
  let isSubscribed = false
  if (userId) {
    const userRole = (session.user as any).role
    // Check if user is author/admin, or check active subscription state
    if (userRole === "ADMIN" || userRole === "AUTHOR" || post.authorId === userId) {
      isSubscribed = true
    } else {
      const activeSub = await prisma.subscription.findFirst({
        where: {
          userId,
          status: "ACTIVE",
        },
      })
      isSubscribed = !!activeSub
    }
  }

  const isLocked = post.isPremium && !isSubscribed

  // Parse blocks
  let blocks: any[] = []
  try {
    blocks = JSON.parse(post.content)
  } catch (e) {
    console.error("Failed to parse post JSON content:", e)
  }

  // If locked, only render the first two blocks
  const visibleBlocks = isLocked ? blocks.slice(0, 2) : blocks

  // Count claps
  const totalClaps = post.reactions
    .filter(r => r.type === "CLAP")
    .reduce((sum, r) => sum + r.count, 0)

  // Check if bookmarked
  let isBookmarked = false
  if (userId) {
    const bookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: { userId, postId: post.id },
      },
    })
    isBookmarked = !!bookmark
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-20">
      <ReadingProgressBar />

      {/* Header Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-500" />
            <span className="font-display font-bold text-slate-900 dark:text-white">
              theeBloggers Blog
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {session ? (
            <Link
              href="/dashboard"
              className="text-xs font-semibold px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl transition-all"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-xs font-semibold px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-all"
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* Article Page Content */}
      <main className="max-w-3xl mx-auto px-6 pt-12">
        {/* Article Metadata Header */}
        <div className="space-y-4 text-center sm:text-left">
          {post.category && (
            <span className="px-3 py-1 bg-brand-500/10 text-[11px] font-bold text-brand-600 dark:text-brand-400 rounded-full border border-brand-500/20 uppercase tracking-wider">
              {post.category.name}
            </span>
          )}

          <h1 className="text-3xl md:text-5xl font-display font-bold text-slate-950 dark:text-white leading-tight">
            {post.title}
          </h1>

          <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed font-sans max-w-2xl">
            {post.excerpt}
          </p>

          {/* Author info card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center font-bold text-brand-600 dark:text-brand-400">
                {post.author.name?.[0] || "A"}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {post.author.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ""}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {post.estimatedReadTime} min read
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Cover Image */}
        {post.featuredImage && (
          <div className="my-8 rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-[300px] md:h-[450px] object-cover"
            />
          </div>
        )}

        {/* Article Body Block Rendering */}
        <article className="prose dark:prose-invert max-w-none font-serif text-lg leading-relaxed text-slate-800 dark:text-slate-200 space-y-6">
          {visibleBlocks.map((block: any) => {
            switch (block.type) {
              case "h1":
                return (
                  <h2 key={block.id} className="text-2xl md:text-3xl font-display font-bold text-slate-950 dark:text-white mt-10 mb-4 leading-tight">
                    {block.text}
                  </h2>
                )
              case "h2":
                return (
                  <h3 key={block.id} className="text-xl md:text-2xl font-display font-semibold text-slate-900 dark:text-slate-100 mt-8 mb-3 leading-snug">
                    {block.text}
                  </h3>
                )
              case "blockquote":
                return (
                  <blockquote key={block.id} className="border-l-4 border-brand-500 pl-4 py-1 italic bg-slate-100 dark:bg-slate-900 rounded-r text-slate-700 dark:text-slate-300 my-6">
                    {block.text}
                  </blockquote>
                )
              case "code":
                return (
                  <div key={block.id} className="relative font-mono bg-slate-950 text-emerald-400 rounded-xl p-5 border border-slate-800 overflow-x-auto text-sm my-6">
                    <span className="absolute top-2 right-4 text-[10px] text-slate-500 uppercase tracking-wider">
                      {block.language || "typescript"}
                    </span>
                    <pre className="whitespace-pre">{block.text}</pre>
                  </div>
                )
              case "image":
                return (
                  <figure key={block.id} className="my-8 space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={block.text} alt={block.data?.caption || "Embedded image"} className="rounded-xl w-full max-h-[450px] object-cover border border-slate-200 dark:border-slate-800" />
                    {block.data?.caption && (
                      <figcaption className="text-center text-xs text-slate-450 italic">
                        {block.data.caption}
                      </figcaption>
                    )}
                  </figure>
                )
              default:
                return (
                  <p key={block.id} className="leading-relaxed mb-4">
                    {block.text}
                  </p>
                )
            }
          })}
        </article>

        {/* Lock Screen Paywall UI */}
        {isLocked && (
          <div className="relative mt-8 p-8 border border-amber-500/20 bg-gradient-to-b from-amber-500/[0.02] to-amber-500/[0.08] dark:to-amber-500/[0.04] rounded-2xl shadow-xl text-center overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[150px] bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent -translate-y-[150px]" />
            <div className="inline-flex items-center justify-center p-3 bg-amber-500/10 rounded-full mb-4 border border-amber-500/20 animate-bounce">
              <Lock className="w-6 h-6 text-amber-600 dark:text-amber-500" />
            </div>
            <h3 className="font-display font-bold text-xl text-slate-950 dark:text-white">
              This article is for premium members only
            </h3>
            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
              Unlock this content and support Milton Odhiambo by subscribing to the premium tier.
            </p>
            
            {/* Stripe simulation checkout action */}
            <form
              action={async () => {
                "use server"
                // Simulate Stripe Checkout Session redirect
                const session = await auth()
                if (!session) {
                  redirect("/login")
                }
                
                // Add active subscription simulation
                await prisma.subscription.create({
                  data: {
                    userId: session.user!.id!,
                    stripeSubscriptionId: `sub_simulated_${Math.random().toString(36).substring(2, 9)}`,
                    stripePriceId: "price_monthly_500",
                    status: "ACTIVE",
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
                  }
                })
                
                redirect(`/posts/${post.slug}`)
              }}
              className="mt-6"
            >
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/10 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                <Sparkles className="w-4 h-4 fill-slate-950" />
                <span>Unlock for $5 / month</span>
              </button>
            </form>
            <p className="text-[10px] text-slate-400 mt-3">Cancel anytime. Secured by Stripe.</p>
          </div>
        )}

        {/* Reader Engagement panel (Claps, shares, bookmarks) */}
        {!isLocked && (
          <ReaderEngagementPanel
            postId={post.id}
            slug={post.slug}
            initialClaps={totalClaps}
            isBookmarked={isBookmarked}
            commentCount={post.comments.length}
          />
        )}

        {/* Nested Comments Discussion Thread */}
        {!isLocked && (
          <CommentSection
            postId={post.id}
            initialComments={post.comments.map(c => ({
              id: c.id,
              content: c.content,
              parentId: c.parentId,
              createdAt: c.createdAt,
              author: {
                id: c.authorId,
                name: c.author.name,
                image: c.author.image,
              },
            }))}
            currentUserId={userId}
            currentUserName={session?.user?.name || undefined}
          />
        )}
      </main>
    </div>
  )
}
