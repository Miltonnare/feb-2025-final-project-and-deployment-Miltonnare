"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const postFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  excerpt: z.string().min(10, "Excerpt must be at least 10 characters"),
  content: z.string().min(10, "Content cannot be empty"),
  categoryId: z.string().optional(),
  featuredImage: z.string().url().optional().or(z.literal("")),
  isPremium: z.boolean().default(false),
  published: z.boolean().default(false),
})

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

// 1. Get Categories
export async function getCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
  })
}

// 2. Create Post
export async function createPost(data: z.infer<typeof postFormSchema>) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const validated = postFormSchema.parse(data)
  
  let baseSlug = slugify(validated.title)
  // Ensure slug uniqueness
  let slug = baseSlug
  let counter = 1
  while (await prisma.post.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  // Calculate read time (rough estimate: 200 words per minute)
  const wordCount = validated.excerpt.split(/\s+/).length + validated.content.split(/\s+/).length
  const estimatedReadTime = Math.max(1, Math.ceil(wordCount / 200))

  const post = await prisma.post.create({
    data: {
      title: validated.title,
      slug,
      excerpt: validated.excerpt,
      content: validated.content,
      featuredImage: validated.featuredImage || null,
      categoryId: validated.categoryId || null,
      isPremium: validated.isPremium,
      published: validated.published,
      publishedAt: validated.published ? new Date() : null,
      authorId: session.user.id,
      estimatedReadTime,
      viewCount: 0,
    },
  })

  // Log audit log
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "POST_CREATE",
      details: `Created post: ${post.title} (Slug: ${post.slug})`,
    },
  })

  revalidatePath("/dashboard")
  revalidatePath("/")
  return post
}

// 3. Update Post
export async function updatePost(id: string, data: z.infer<typeof postFormSchema>) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const postToUpdate = await prisma.post.findUnique({
    where: { id },
    select: { authorId: true, title: true, slug: true, published: true },
  })

  if (!postToUpdate) throw new Error("Post not found")
  if (postToUpdate.authorId !== session.user.id && (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized to edit this post")
  }

  const validated = postFormSchema.parse(data)

  // Regenerate slug only if title changes
  let slug = postToUpdate.slug
  if (postToUpdate.title !== validated.title) {
    let baseSlug = slugify(validated.title)
    slug = baseSlug
    let counter = 1
    while (await prisma.post.findUnique({ where: { slug, NOT: { id } } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }
  }

  const wordCount = validated.excerpt.split(/\s+/).length + validated.content.split(/\s+/).length
  const estimatedReadTime = Math.max(1, Math.ceil(wordCount / 200))

  // Determine published timestamp
  const publishedAt = validated.published 
    ? (postToUpdate.published ? undefined : new Date()) // Set now if newly publishing
    : null

  const post = await prisma.post.update({
    where: { id },
    data: {
      title: validated.title,
      slug,
      excerpt: validated.excerpt,
      content: validated.content,
      featuredImage: validated.featuredImage || null,
      categoryId: validated.categoryId || null,
      isPremium: validated.isPremium,
      published: validated.published,
      publishedAt: validated.published ? (postToUpdate.published ? undefined : new Date()) : null,
      estimatedReadTime,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "POST_UPDATE",
      details: `Updated post ID ${id}: ${post.title}`,
    },
  })

  revalidatePath("/dashboard")
  revalidatePath(`/posts/${post.slug}`)
  revalidatePath("/")
  return post
}

// 4. Delete Post
export async function deletePost(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const post = await prisma.post.findUnique({
    where: { id },
    select: { authorId: true, title: true },
  })

  if (!post) throw new Error("Post not found")
  if (post.authorId !== session.user.id && (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized to delete this post")
  }

  await prisma.post.delete({ where: { id } })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "POST_DELETE",
      details: `Deleted post: ${post.title} (ID: ${id})`,
    },
  })

  revalidatePath("/dashboard")
  revalidatePath("/")
  return { success: true }
}

// 5. Get User Posts
export async function getUserPosts() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  return prisma.post.findMany({
    where: { authorId: session.user.id },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  })
}
