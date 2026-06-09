import { Metadata } from "next";
import { db } from "@/lib/db";

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
    const cleanPath = post.imageUrl.startsWith("http") || post.imageUrl.startsWith("/")
      ? post.imageUrl
      : post.imageUrl.startsWith("uploads/")
      ? `/${post.imageUrl}`
      : `/uploads/${post.imageUrl}`;
    ogImage = cleanPath.startsWith("http") ? cleanPath : `${ORIGIN}${cleanPath}`;
  } else if (post.photos && post.photos.length > 0) {
    const photo = post.photos[0];
    const cleanPath = photo.photoPath.startsWith("http") || photo.photoPath.startsWith("/")
      ? photo.photoPath
      : photo.photoPath.startsWith("uploads/")
      ? `/${photo.photoPath}`
      : `/uploads/posts/${photo.photoPath}`;
    ogImage = cleanPath.startsWith("http") ? cleanPath : `${ORIGIN}${cleanPath}`;
  } else if (post.linkImage) {
    const cleanPath = post.linkImage.startsWith("http") || post.linkImage.startsWith("/")
      ? post.linkImage
      : post.linkImage.startsWith("uploads/")
      ? `/${post.linkImage}`
      : `/uploads/${post.linkImage}`;
    ogImage = cleanPath.startsWith("http") ? cleanPath : `${ORIGIN}${cleanPath}`;
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

// Serve the metadata to crawlers at HTTP 200 while performing client-side redirect for human users
export default async function PostSharePage({ params }: Props) {
  const { id } = await params;
  const postId = parseInt(id, 10);
  const redirectUrl = isNaN(postId) ? "/feed" : `/feed?post=${postId}`;

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0b1520", // Sleek dark navy matching HGF app branding
      color: "#ffffff",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      textAlign: "center",
      padding: "20px"
    }}>
      {/* Client-side redirect script and fallback meta refresh */}
      <meta httpEquiv="refresh" content={`0; url=${redirectUrl}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.location.href = ${JSON.stringify(redirectUrl)};`,
        }}
      />
      
      <div style={{ maxWidth: "400px" }}>
        <div style={{
          background: "rgba(255, 255, 255, 0.03)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "20px",
          padding: "40px 30px",
          boxShadow: "0 10px 40px 0 rgba(0, 0, 0, 0.4)"
        }}>
          {/* Branded loading spinner */}
          <div style={{
            width: "36px",
            height: "36px",
            border: "3px solid rgba(78, 177, 203, 0.15)",
            borderTop: "3px solid #4EB1CB",
            borderRadius: "50%",
            animation: "hgf-spin 0.8s linear infinite",
            margin: "0 auto 24px"
          }} />
          
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes hgf-spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}} />
          
          <h3 style={{ margin: "0 0 12px 0", color: "#4EB1CB", fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
            Redirecting to HGF Connect
          </h3>
          <p style={{ margin: 0, opacity: 0.6, fontSize: "0.85rem", lineHeight: "1.5" }}>
            Connecting you to the community feed. If the app does not load,{" "}
            <a href={redirectUrl} style={{ color: "#4EB1CB", textDecoration: "underline", fontWeight: 600 }}>click here</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
