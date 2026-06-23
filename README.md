# theeBloggers: Modern SaaS Publishing Platform

Welcome to **theeBloggers**, a production-grade, SaaS-ready publishing platform built to compete directly with products like Substack, Medium, Ghost, and Hashnode. 

Re-architected from a basic static site, theeBloggers is engineered for scale, performance, premium typography, advanced SEO, monetization hooks, and AI-assisted content creation.

---

## 🚀 Key Features

*   **✍️ Notion-Style Block Editor**: A state-of-the-art editor supporting multiple block types (paragraphs, headings, blockquotes, code blocks, and cover/inline images), custom Markdown shortcuts, and a floating `/` command selector menu.
*   **🤖 Google Gemini AI Assistant**: Deeply integrated writing companion powered by `gemini-1.5-flash` providing click-worthy title suggestions, automated SEO excerpts, and constructive readability feedback (with simulation fallbacks if API keys are missing).
*   **💳 Creator Paywall & Monetization**: Built-in paywall toggle on individual articles. Unsubscribed readers are restricted to the first 2 blocks of premium articles, showing a beautiful locked screen with a simulated Stripe subscription checkout.
*   **💬 Nested Discussion Trees**: Multi-level indented comment sections supporting markdown-style responses, optimistic state updates, and email notifications to authors.
*   **📊 Creator Dashboard**: Visual analytics suite showcasing page views, claps count, follower counts, and projected Stripe monthly earnings metrics, coupled with an article manager (edit/delete drafts and publications).
*   **📰 Server-Side News Feed**: Kenya and global news fetched securely on the server via `NewsData` REST integration (protecting API keys and caching queries for 1 hour to prevent rate limits).
*   **🎨 Premium UI & Dark Mode**: Styled with Tailwind CSS, Framer Motion, and Radix UI elements. Features Google Fonts (`Inter` + `Plus Jakarta Sans` + `Merriweather` serif) and a client hydration-guarded theme switcher to prevent page flashing.
*   **🔍 SEO & Crawler Optimization**: Fully dynamic OpenGraph metadata generators, automated dynamic sitemaps (`/sitemap.xml`), and spider crawlers configuration (`/robots.txt`).

---

## 🛠️ Technical Stack

*   **Frontend**: Next.js 16+ (App Router), React 19+, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion.
*   **Backend**: Next.js Server Actions, NextAuth.js (Auth.js v5) with Google & GitHub OAuth.
*   **Database & ORM**: SQLite (for zero-config local development) migrating to PostgreSQL in production via **Prisma ORM**.
*   **AI Integration**: Direct REST fetching to the **Google Gemini API**.
*   **Monetization**: **Stripe Sandbox API** connection hooks.
*   **Scheduling & Crawler Optimizations**: Dynamic sitemaps (`sitemap.ts`) and Robots policy (`robots.ts`).

---

## 📂 Project Architecture

```text
src/
├── app/                           # Dynamic App Router pages & server routes
│   ├── (auth)/                    # Authentication pages (login, signup)
│   ├── (platform)/                # Dashboard, Editor, dynamic /posts/[slug]
│   ├── api/                       # API handlers (e.g. NextAuth endpoints)
│   ├── layout.tsx                 # Root layout (Theme providers, fonts)
│   └── page.tsx                   # Main home feed & global news sidebar
├── components/                    # Global reusable UI and layout elements
│   ├── theme-toggle.tsx           # Hydration-guarded light/dark toggle
│   └── reading-progress-bar.tsx   # Article reader progress tracker
├── features/                      # Domain-specific modules
│   ├── comments/                  # Commenting actions & nested UI
│   ├── editor/                    # Block editor logic, AI assistants
│   └── posts/                     # Database post mutations & categories
└── lib/                           # Core utilities (Prisma, NextAuth config)
```

---

## ⚡ Quick Start

### 1. Installation
Install all backend and client-side dependencies:
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill out placeholders if you have active Google, GitHub, or Gemini API keys:
```bash
cp .env.example .env
```
*Note: If no `GEMINI_API_KEY` is present, the platform will automatically simulate AI responses so the writing assistant can still be tested locally.*

### 3. Initialize and Seed the Database
Synchronize the Prisma models to compile your local SQLite database (`dev.db`), and run the seeder script to migrate the legacy `posts.json` content and mock analytics:
```bash
# Sync Schema
npx prisma db push

# Run Legacy Seeder
npx prisma db seed
```
*(Alternatively, run `npx tsx prisma/seed.ts` directly)*

### 4. Start Development Server
Launch the application:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the site.

---

## 🧪 Production Compilation Verification

To test compilation correctness, build the static and dynamic bundles:
```bash
npm run build
```
This generates the optimized bundle cleanly:
*   **Static Pages (○)**: `/login`, `/editor`, `/robots.txt`, `/sitemap.xml`
*   **Dynamic Pages (ƒ)**: `/` (Home), `/dashboard`, `/posts/[slug]` (Reader Page)

---

## 🔄 Legacy Migration Details

The original blog files are backed up in [/legacy-site/](file:///c:/Users/user/OneDrive/Documents/Blog%20App/legacy-site/).
The seeder script parses `legacy-site/posts.json`, creates default mock categories, sets up author/admin profiles, and converts the plain-text excerpts into valid JSON blocks matching the new block editor schema.
