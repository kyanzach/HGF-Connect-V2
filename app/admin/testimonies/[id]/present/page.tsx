import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Image from "next/image";

// Force dynamic since we don't want to cache presentation views statically at build time
export const dynamic = "force-dynamic";

export default async function PresentationView({ params }: { params: { id: string } }) {
  const testimonyId = parseInt(params.id);
  if (isNaN(testimonyId)) notFound();

  const testimony = await db.testimony.findUnique({
    where: { id: testimonyId },
    include: {
      member: true,
      photos: { orderBy: { sortOrder: "asc" } }
    }
  });

  if (!testimony) notFound();

  const displayName = `${testimony.member.firstName} ${testimony.member.lastName}`;
  const displayText = testimony.translatedContent || testimony.content;
  
  // Clean presentation view with dark theme suitable for TVs/Projectors
  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)",
      color: "white",
      fontFamily: "system-ui, -apple-system, sans-serif",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "2rem 4rem",
        display: "flex",
        alignItems: "center",
        gap: "1.5rem",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(0,0,0,0.2)"
      }}>
        <div style={{ width: "80px", height: "80px", borderRadius: "50%", overflow: "hidden", border: "3px solid #4EB1CB", flexShrink: 0 }}>
          {testimony.member.profilePicture ? (
            <img src={`/uploads/profile_pictures/${testimony.member.profilePicture}`} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>👤</div>
          )}
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>{displayName}</h1>
          {testimony.category && (
            <div style={{ color: "#4EB1CB", fontSize: "1.25rem", fontWeight: 600, marginTop: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {testimony.category} Testimony
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, display: "flex", padding: "4rem", gap: "4rem" }}>
        
        {/* Main Text */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{
            fontSize: "clamp(2rem, 4vw, 3.5rem)",
            lineHeight: 1.4,
            fontWeight: 500,
            margin: 0,
            whiteSpace: "pre-wrap",
            textShadow: "0 2px 10px rgba(0,0,0,0.5)"
          }}>
            "{displayText}"
          </p>
        </div>

        {/* Photos Grid (if any) */}
        {testimony.photos.length > 0 && (
          <div style={{
            flex: "0 0 40%",
            display: "grid",
            gridTemplateColumns: testimony.photos.length === 1 ? "1fr" : "1fr 1fr",
            gap: "1rem",
            alignContent: "center"
          }}>
            {testimony.photos.map((photo, i) => (
              <div key={i} style={{ 
                width: "100%", 
                aspectRatio: testimony.photos.length === 1 ? "4/3" : "1/1",
                borderRadius: "16px", 
                overflow: "hidden",
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                border: "2px solid rgba(255,255,255,0.1)"
              }}>
                <img 
                  src={`/uploads/testimonies/${photo.photoPath}`} 
                  alt="Testimony scene" 
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
