import { Metadata } from "next";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

const ORIGIN = "https://connect.houseofgrace.ph";

async function getPost(id: number) {
  return db.post.findUnique({
    where: { id },
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
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const postId = parseInt(id, 10);
  if (isNaN(postId)) return { title: "HGF Connect" };

  const post = await getPost(postId);
  if (!post) return { title: "Post Not Found — HGF Connect" };

  const isQuizPost = post.type === "QUIZ_ANNOUNCEMENT" || post.type === "QUIZ_DAILY" || post.type === "QUIZ_REWARD";
  const isBirthdayPost = post.type === "BIRTHDAY_MONTHLY" || post.type === "BIRTHDAY_DAILY";
  const isEventPost = post.type === "EVENT";

  const authorName = isQuizPost
    ? "HGF Quiz For Christ"
    : isBirthdayPost || isEventPost
    ? "House of Grace Fellowship"
    : `${post.author.firstName} ${post.author.lastName}`;

  // Build title by post type
  let title = `${authorName} — HGF Connect`;
  let description = post.content?.slice(0, 200) || "View this post on HGF Connect.";

  switch (post.type) {
    case "QUIZ_REWARD":
      title = `🎁 Quiz Reward Announcement — HGF Connect`;
      description = post.content?.slice(0, 200) || "A weekly quiz reward has been announced!";
      break;
    case "QUIZ_ANNOUNCEMENT":
      title = `🧠 Weekly Quiz for Christ — HGF Connect`;
      description = post.content?.slice(0, 200) || "Join the weekly sermon quiz!";
      break;
    case "QUIZ_DAILY":
      title = `🧠 Daily Challenge — HGF Connect`;
      description = post.content?.slice(0, 200) || "Play today's daily challenge!";
      break;
    case "PRAYER":
      title = `🙏 Prayer Request — HGF Connect`;
      description = post.content?.slice(0, 200) || "Please pray for this request.";
      break;
    case "PRAISE":
      title = `🎉 Testimony from ${authorName} — HGF Connect`;
      description = post.content?.slice(0, 200) || "Praise God! Read this testimony.";
      break;
    case "EVENT":
      title = `📅 Church Event — HGF Connect`;
      description = post.content?.replace(/\[event:\d+\]/g, "").trim().slice(0, 200) || "See this church event.";
      break;
    case "DEVO":
      title = `📖 Devotional by ${authorName} — HGF Connect`;
      description = post.content?.slice(0, 200) || "Read this devotional.";
      break;
    default:
      title = `${authorName} on HGF Connect`;
  }

  // Resolve OG image: reward images > post imageUrl > first photo > link image > site logo
  let ogImage = `${ORIGIN}/og-default.png`;

  if (post.imageUrl && !post.imageUrl.startsWith("bg:")) {
    ogImage = post.imageUrl.startsWith("http")
      ? post.imageUrl
      : post.imageUrl.startsWith("/")
      ? `${ORIGIN}${post.imageUrl}`
      : `${ORIGIN}/uploads/${post.imageUrl}`;
  } else if (post.photos && post.photos.length > 0) {
    const photo = post.photos[0];
    ogImage = photo.photoPath.startsWith("http")
      ? photo.photoPath
      : photo.photoPath.startsWith("/")
      ? `${ORIGIN}${photo.photoPath}`
      : `${ORIGIN}/uploads/posts/${photo.photoPath}`;
  } else if (post.linkImage) {
    ogImage = post.linkImage;
  }

  const shareUrl = `${ORIGIN}/p/${postId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: shareUrl,
      siteName: "HGF Connect",
      type: "article",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: shareUrl,
    },
  };
}

// Human users get redirected immediately to the feed with the post highlighted
export default async function PostSharePage({ params }: Props) {
  const { id } = await params;
  const postId = parseInt(id, 10);
  if (isNaN(postId)) redirect("/feed");
  redirect(`/feed?post=${postId}`);
}
