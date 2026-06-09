import { Metadata } from "next";
import { db } from "@/lib/db";
import FeedClient from "./FeedClient";

interface Props {
  searchParams: Promise<{ post?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const postIdStr = params.post;
  if (!postIdStr) {
    return {
      title: "Community Feed — HGF Connect",
      description: "Connect with the House of Grace Fellowship community.",
    };
  }

  const postId = parseInt(postIdStr, 10);
  if (isNaN(postId)) return { title: "HGF Connect" };

  const post = await db.post.findUnique({
    where: { id: postId },
    include: {
      author: {
        select: { firstName: true, lastName: true },
      },
      photos: {
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
  });

  if (!post) {
    return {
      title: "Post Not Found — HGF Connect",
    };
  }

  const authorName = `${post.author.firstName} ${post.author.lastName}`;
  let title = `${authorName} shared a post — HGF Connect`;
  let description = post.content || "View this post on HGF Connect.";

  if (post.type === "QUIZ_ANNOUNCEMENT") {
    title = `🧠 Weekly Quiz Reward: ${post.content?.split("\n")[0] || "New Announcement"} — HGF Connect`;
    description = post.content || "🧠 Weekly Quiz for Christ Reward Announcement! Complete the challenges to win prizes.";
  } else if (post.type === "PRAYER") {
    title = `🙏 Prayer Request from ${authorName} — HGF Connect`;
    description = post.content || "Please join us in praying for this request.";
  } else if (post.type === "PRAISE") {
    title = `🎉 Testimony from ${authorName} — HGF Connect`;
    description = post.content || "Praise God! Read this testimony.";
  }

  // Ensure absolute Open Graph image URL
  const origin = "https://connect.houseofgrace.ph";
  let ogImageUrl = `${origin}/logo.png`; // Fallback site logo

  if (post.imageUrl) {
    ogImageUrl = post.imageUrl.startsWith("http")
      ? post.imageUrl
      : post.imageUrl.startsWith("/")
      ? `${origin}${post.imageUrl}`
      : `${origin}/uploads/${post.imageUrl}`;
  } else if (post.photos && post.photos.length > 0) {
    const photo = post.photos[0];
    ogImageUrl = photo.photoPath.startsWith("http")
      ? photo.photoPath
      : photo.photoPath.startsWith("/")
      ? `${origin}${photo.photoPath}`
      : `${origin}/uploads/posts/${photo.photoPath}`;
  } else if (post.linkImage) {
    ogImageUrl = post.linkImage;
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${origin}/feed?post=${post.id}`,
      siteName: "HGF Connect",
      images: [
        {
          url: ogImageUrl,
          width: 800,
          height: 600,
          alt: title,
        },
      ],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function FeedPage() {
  return <FeedClient />;
}
