import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { EditorWorkspace } from "@/features/editor/components/editor-workspace"

interface EditEditorPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: EditEditorPageProps) {
  const { id } = await params
  const post = await prisma.post.findUnique({
    where: { id },
    select: { title: true },
  })
  return {
    title: post ? `Edit: ${post.title}` : "Edit Article",
  }
}

export default async function EditEditorPage({ params }: EditEditorPageProps) {
  const { id } = await params

  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const post = await prisma.post.findUnique({
    where: { id },
  })

  if (!post) {
    notFound()
  }

  // Enforce ownership or admin checks
  if (post.authorId !== session.user.id && (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized to edit this article")
  }

  return (
    <EditorWorkspace
      post={{
        id: post.id,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        categoryId: post.categoryId,
        featuredImage: post.featuredImage,
        isPremium: post.isPremium,
        published: post.published,
      }}
    />
  )
}
