import { PrismaClient } from "@prisma/client"
import * as fs from "fs"
import * as path from "path"

const prisma = new PrismaClient()

async function main() {
  console.log("Starting SQLite database seeding...")

  // 1. Clean existing records (optional, but good for idempotent seeding)
  await prisma.tagsOnPosts.deleteMany({})
  await prisma.tag.deleteMany({})
  await prisma.comment.deleteMany({})
  await prisma.reaction.deleteMany({})
  await prisma.bookmark.deleteMany({})
  await prisma.readingHistory.deleteMany({})
  await prisma.post.deleteMany({})
  await prisma.category.deleteMany({})
  await prisma.profile.deleteMany({})
  await prisma.user.deleteMany({})

  // 2. Create Users
  const adminUser = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@platform.com",
      role: "ADMIN",
      profile: {
        create: {
          bio: "Lead developer and administrator of the Antigravity Blog SaaS Platform.",
          skills: JSON.stringify(["Next.js", "PostgreSQL", "System Architecture"]),
          expertise: JSON.stringify(["SaaS Architecture", "Platform Engineering"]),
          badges: JSON.stringify(["Founder", "Admin"]),
        },
      },
    },
  })

  const authorUser = await prisma.user.create({
    data: {
      name: "Milton Odhiambo",
      email: "milton@platform.com",
      role: "AUTHOR",
      profile: {
        create: {
          bio: "Content creator, tech writer, and football analyst.",
          skills: JSON.stringify(["Writing", "Football Analysis", "Crypto Research"]),
          expertise: JSON.stringify(["Technology Trends", "Cryptocurrency"]),
          badges: JSON.stringify(["Top Writer", "Contributor"]),
        },
      },
    },
  })

  const readerUser = await prisma.user.create({
    data: {
      name: "Jane Reader",
      email: "reader@platform.com",
      role: "READER",
      profile: {
        create: {
          bio: "Avid tech and sports reader.",
          skills: JSON.stringify(["Learning"]),
          expertise: JSON.stringify(["Reading"]),
          badges: JSON.stringify(["Pioneer Reader"]),
        },
      },
    },
  })

  console.log("Users created:", { adminUser: adminUser.email, authorUser: authorUser.email })

  // 3. Create Categories
  const categoriesMap: Record<string, string> = {
    "Tech": "Technology & Trends",
    "Politics": "Politics & Discourse",
    "Cryptocurrency": "Cryptocurrency & Web3",
    "Football": "Football & Sports",
    "Entertainment": "Entertainment & Culture",
  }

  const dbCategories: Record<string, any> = {}
  for (const [name, description] of Object.entries(categoriesMap)) {
    const slug = name.toLowerCase().replace(/\s+/g, "-")
    const category = await prisma.category.create({
      data: { name, slug, description },
    })
    dbCategories[name.toLowerCase()] = category
    console.log(`Category created: ${name}`)
  }

  // 4. Read and Migrate posts.json
  const legacyPostsPath = path.join(process.cwd(), "legacy-site", "posts.json")
  if (fs.existsSync(legacyPostsPath)) {
    const legacyData = JSON.parse(fs.readFileSync(legacyPostsPath, "utf-8"))

    for (const legacyCategory of legacyData) {
      const categoryName = legacyCategory.category
      const categoryKey = categoryName.toLowerCase() === "cryptocurrency" ? "cryptocurrency" : categoryName.toLowerCase()
      const category = dbCategories[categoryKey] || dbCategories["tech"] // Fallback to tech

      console.log(`Migrating posts for category: ${categoryName}...`)

      for (const legacyPost of legacyCategory.posts) {
        const slug = legacyPost.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")

        // Build Notion-like Editor JSON blocks from post attributes
        const editorContent = [
          {
            id: `block-${Math.random().toString(36).substring(2, 9)}`,
            type: "header",
            data: { text: legacyPost.title, level: 1 },
          },
          {
            id: `block-${Math.random().toString(36).substring(2, 9)}`,
            type: "paragraph",
            data: { text: legacyPost.excerpt },
          },
          {
            id: `block-${Math.random().toString(36).substring(2, 9)}`,
            type: "image",
            data: {
              url: `/${legacyPost.image}`,
              caption: legacyPost.title,
            },
          },
          {
            id: `block-${Math.random().toString(36).substring(2, 9)}`,
            type: "paragraph",
            data: {
              text: `This article on "${legacyPost.title}" was migrated from the legacy blog. We will unpack how this development shapes current industry trends in Kenya and globally. Stay tuned for further updates as this story develops.`,
            },
          },
        ]

        const publishedDate = legacyPost.date ? new Date(legacyPost.date) : new Date()

        await prisma.post.create({
          data: {
            title: legacyPost.title,
            slug,
            excerpt: legacyPost.excerpt.substring(0, 300),
            content: JSON.stringify(editorContent),
            featuredImage: `/${legacyPost.image}`,
            published: true,
            publishedAt: publishedDate,
            authorId: authorUser.id,
            categoryId: category.id,
            estimatedReadTime: Math.max(1, Math.ceil(legacyPost.excerpt.split(/\s+/).length / 200)),
            viewCount: Math.floor(Math.random() * 500) + 10,
          },
        })
      }
    }
    console.log("Legacy posts migration seeding complete.")
  } else {
    console.log("No legacy posts.json found. Skipping posts migration.")
  }

  // 5. Seed some dummy comments & claps
  const samplePosts = await prisma.post.findMany({ take: 5 })
  for (const post of samplePosts) {
    // Add Claps
    await prisma.reaction.create({
      data: {
        type: "CLAP",
        count: Math.floor(Math.random() * 40) + 5,
        userId: readerUser.id,
        postId: post.id,
      },
    })

    // Add nested comments
    const parentComment = await prisma.comment.create({
      data: {
        content: `Great overview on ${post.title}! Excited to see where this goes.`,
        postId: post.id,
        authorId: readerUser.id,
      },
    })

    await prisma.comment.create({
      data: {
        content: `Thanks for reading, Jane! We'll keep updating this.`,
        postId: post.id,
        authorId: authorUser.id,
        parentId: parentComment.id,
      },
    })
  }

  console.log("Comments and Reactions seeding complete.")
  console.log("Database seeding finished successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
