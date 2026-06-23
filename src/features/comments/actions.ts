"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const commentSchema = z.object({
  postId: z.string(),
  content: z.string().min(1, "Comment cannot be empty").max(1000, "Comment too long"),
  parentId: z.string().optional(),
})

// 1. Add Comment / Reply
export async function createComment(data: z.infer<typeof commentSchema>) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("You must be signed in to comment.")

  const validated = commentSchema.parse(data)

  const comment = await prisma.comment.create({
    data: {
      postId: validated.postId,
      content: validated.content,
      parentId: validated.parentId || null,
      authorId: session.user.id,
    },
    include: {
      author: true,
    },
  })

  // Create notifications if commenting or replying
  const post = await prisma.post.findUnique({
    where: { id: validated.postId },
    select: { authorId: true, title: true, slug: true },
  })

  if (post && post.authorId !== session.user.id) {
    await prisma.notification.create({
      data: {
        userId: post.authorId,
        type: "COMMENT",
        title: "New Comment",
        message: `${session.user.name || "A reader"} commented on your article: "${post.title}"`,
        link: `/posts/${post.slug}#comment-${comment.id}`,
      },
    })
  }

  revalidatePath(`/posts/${post?.slug}`)
  return comment
}

// 2. Clap for Post (Up to 50 Claps per user)
export async function clapPost(postId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("You must be signed in to clap.")

  const userId = session.user.id

  const existingReaction = await prisma.reaction.findFirst({
    where: {
      postId,
      userId,
      type: "CLAP",
    },
  })

  if (existingReaction) {
    if (existingReaction.count >= 50) {
      return { count: 50, message: "Max claps reached" }
    }
    const updated = await prisma.reaction.update({
      where: { id: existingReaction.id },
      data: { count: existingReaction.count + 1 },
    })
    
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { slug: true } })
    revalidatePath(`/posts/${post?.slug}`)
    return { count: updated.count }
  } else {
    const created = await prisma.reaction.create({
      data: {
        postId,
        userId,
        type: "CLAP",
        count: 1,
      },
    })
    
    // Notify post author
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, title: true, slug: true },
    })

    if (post && post.authorId !== userId) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          type: "CLAP",
          title: "New Clap",
          message: `${session.user.name || "A reader"} clapped for your article: "${post.title}"`,
          link: `/posts/${post.slug}`,
        },
      })
    }

    revalidatePath(`/posts/${post?.slug}`)
    return { count: created.count }
  }
}

// 3. Toggle Bookmark
export async function toggleBookmark(postId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("You must be signed in to bookmark.")

  const userId = session.user.id

  const existingBookmark = await prisma.bookmark.findUnique({
    where: {
      userId_postId: { userId, postId },
    },
  })

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { slug: true } })

  if (existingBookmark) {
    await prisma.bookmark.delete({
      where: { id: existingBookmark.id },
    })
    revalidatePath(`/posts/${post?.slug}`)
    return { bookmarked: false }
  } else {
    await prisma.bookmark.create({
      data: { userId, postId },
    })
    revalidatePath(`/posts/${post?.slug}`)
    return { bookmarked: true }
  }
}
