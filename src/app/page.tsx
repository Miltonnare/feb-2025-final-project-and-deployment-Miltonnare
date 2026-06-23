import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { ThemeToggle } from "@/components/theme-toggle"
import { BookOpen, Search, Sparkles, Clock, Eye, ArrowRight, Rss, Heart } from "lucide-react"

export const revalidate = 60 // Cache home page for 60 seconds (ISR)

interface HomePageProps {
  searchParams: Promise<{ category?: string; q?: string }>
}

interface NewsArticle {
  title: string
  link: string
  description: string | null
  pubDate: string
}

// Server-side fetching of legacy news feed (protecting API keys and caching results)
async function getNewsFeed(): Promise<NewsArticle[]> {
  const apiKey = "pub_85359147204a4676ae83fc7343bb9654c8445"
  const url = `https://newsdata.io/api/1/latest?apikey=${apiKey}&category=politics&country=ke`
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } }) // Cache news for 1 hour
    if (!res.ok) return []
    const data = await res.json()
    if (data.status === "success" && data.results) {
      return data.results.slice(0, 5).map((item: any) => ({
        title: item.title,
        link: item.link,
        description: item.description,
        pubDate: item.pubDate,
      }))
    }
    return []
  } catch (e) {
    console.error("News fetch failed:", e)
    return []
  }
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const categorySlug = params.category
  const searchQuery = params.q
  const session = await auth()

  // 1. Fetch Categories
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  })

  // 2. Build Post Filters
  const whereCondition: any = { published: true }

  if (categorySlug) {
    whereCondition.category = { slug: categorySlug }
  }

  if (searchQuery) {
    whereCondition.OR = [
      { title: { contains: searchQuery } },
      { excerpt: { contains: searchQuery } },
    ]
  }

  // 3. Fetch Posts
  const posts = await prisma.post.findMany({
    where: whereCondition,
    include: {
      category: true,
      author: true,
      reactions: { where: { type: "CLAP" } },
    },
    orderBy: { publishedAt: "desc" },
  })

  // 4. Fetch News Feed
  const newsArticles = await getNewsFeed()

  // 5. Featured Article (most viewed published post)
  const featuredPost = posts.reduce((prev, current) => {
    return (prev.viewCount > current.viewCount) ? prev : current
  }, posts[0])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-20">
      {/* Global Portal Nav */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand-500" />
          <span className="font-display font-bold text-slate-900 dark:text-white text-lg">
            theeBloggers
          </span>
        </div>

        {/* Global Search Bar */}
        <form action="/" method="GET" className="hidden md:flex items-center relative max-w-sm w-full mx-8">
          <Search className="absolute left-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            name="q"
            defaultValue={searchQuery || ""}
            placeholder="Search stories, categories, authors..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-250 outline-hidden focus:ring-1 focus:ring-brand-500 focus:bg-white"
          />
        </form>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          {session ? (
            <Link
              href="/dashboard"
              className="text-xs font-semibold px-4 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl transition-all shadow-xs"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-xs font-semibold px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-all shadow-md shadow-brand-500/10"
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* Main Home Layout */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Banner Hero */}
        {!searchQuery && !categorySlug && featuredPost && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-xs">
            <div className="lg:col-span-7 rounded-2xl overflow-hidden shadow">
              {featuredPost.featuredImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={featuredPost.featuredImage}
                  alt={featuredPost.title}
                  className="w-full h-64 md:h-[400px] object-cover"
                />
              ) : (
                <div className="w-full h-64 md:h-[400px] bg-gradient-to-r from-brand-500/10 to-violet-500/10 flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-brand-500/30" />
                </div>
              )}
            </div>
            
            <div className="lg:col-span-5 flex flex-col justify-between py-2">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-[10px] font-bold text-amber-600 dark:text-amber-500 rounded-full border border-amber-500/20 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 fill-amber-500/10" />
                  <span>Trending Story</span>
                </span>
                
                <h2 className="font-display text-2xl md:text-3xl font-bold text-slate-950 dark:text-white hover:underline leading-tight">
                  <Link href={`/posts/${featuredPost.slug}`}>
                    {featuredPost.title}
                  </Link>
                </h2>
                
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-4">
                  {featuredPost.excerpt}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-355">
                    {featuredPost.author.name?.[0] || "A"}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {featuredPost.author.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {featuredPost.publishedAt ? new Date(featuredPost.publishedAt).toLocaleDateString() : ""}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/posts/${featuredPost.slug}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-500"
                >
                  <span>Read Article</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Categories Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 border-b border-slate-200 dark:border-slate-850">
          <Link
            href="/"
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              !categorySlug
                ? "bg-brand-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 hover:bg-slate-50"
            }`}
          >
            All Publications
          </Link>
          {categories.map(cat => (
            <Link
              key={cat.id}
              href={`/?category=${cat.slug}`}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                categorySlug === cat.slug
                  ? "bg-brand-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 hover:bg-slate-50"
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {/* Content Layout Grid (Feed + News Widget Sidebar) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Feed Column */}
          <section className="lg:col-span-8 space-y-6">
            {posts.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No articles found</p>
                <p className="text-xs text-slate-500 mt-1">
                  Try adjusting your search query or switching categories.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {posts.map(post => {
                  const clapsCount = post.reactions.reduce((sum, r) => sum + r.count, 0)
                  return (
                    <article
                      key={post.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md dark:hover:border-slate-700 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {post.featuredImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={post.featuredImage}
                            alt={post.title}
                            className="w-full h-48 object-cover"
                          />
                        ) : (
                          <div className="w-full h-48 bg-gradient-to-r from-brand-500/5 to-violet-500/5 flex items-center justify-center border-b border-slate-100 dark:border-slate-800">
                            <BookOpen className="w-10 h-10 text-brand-500/20" />
                          </div>
                        )}
                        
                        <div className="p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-brand-500 uppercase tracking-wider">
                              {post.category?.name || "Uncategorized"}
                            </span>
                            {post.isPremium && (
                              <span className="px-2 py-0.5 bg-amber-500/10 text-[9px] font-bold text-amber-600 dark:text-amber-500 rounded-full border border-amber-500/20">
                                Premium
                              </span>
                            )}
                          </div>
                          
                          <h3 className="font-display font-bold text-lg text-slate-950 dark:text-white leading-snug hover:underline">
                            <Link href={`/posts/${post.slug}`}>
                              {post.title}
                            </Link>
                          </h3>
                          
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                            {post.excerpt}
                          </p>
                        </div>
                      </div>

                      <div className="p-5 pt-0 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50 mt-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-slate-300">
                            {post.author.name?.[0] || "A"}
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-slate-800 dark:text-slate-200">
                              {post.author.name}
                            </p>
                            <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-0.5">
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3" /> {post.estimatedReadTime} min read
                              </span>
                              <span>·</span>
                              <span className="flex items-center gap-0.5">
                                <Eye className="w-3 h-3" /> {post.viewCount} views
                              </span>
                            </div>
                          </div>
                        </div>

                        {clapsCount > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-pink-500 font-semibold">
                            <Heart className="w-3.5 h-3.5 fill-pink-500" />
                            <span>{clapsCount}</span>
                          </div>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          {/* Sidebar World News Column */}
          <aside className="lg:col-span-4 space-y-6">
            
            {/* Global News Section (Server Fetched widget) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="font-display font-bold text-sm text-slate-950 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Rss className="w-4 h-4 text-brand-500" />
                <span>Regional & Global News</span>
              </h3>

              {newsArticles.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  Failed to fetch latest regional news or daily limit exceeded.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 space-y-3">
                  {newsArticles.map((article, index) => (
                    <div key={index} className="pt-3 first:pt-0 space-y-1.5">
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-brand-500 leading-snug">
                        <a href={article.link} target="_blank" rel="noopener noreferrer">
                          {article.title}
                        </a>
                      </h4>
                      {article.description && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {article.description}
                        </p>
                      )}
                      <p className="text-[9px] text-slate-400">
                        {new Date(article.pubDate).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Premium Subscriber CTA Card */}
            <div className="bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-20%] w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
              <h3 className="font-display font-bold text-lg leading-tight">
                Unlock Premium Access
              </h3>
              <p className="text-xs text-brand-100 mt-2 leading-relaxed">
                Read exclusive paywalled posts, follow topics, comment, and support premium creators.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full mt-4 py-2.5 bg-white text-brand-650 font-bold text-xs rounded-xl shadow transition-transform hover:-translate-y-0.5"
              >
                Get Premium Membership
              </Link>
            </div>
          </aside>
        </div>

      </main>
    </div>
  )
}
