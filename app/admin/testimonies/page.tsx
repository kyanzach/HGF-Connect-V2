"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const PRIMARY = "#4EB1CB";

type Testimony = {
  id: number;
  content: string;
  translatedContent: string | null;
  category: string | null;
  tags: string | null;
  isFeatured: boolean;
  status: string;
  createdAt: string;
  member: {
    id: number;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
  };
  photos: { photoPath: string }[];
};

export default function AdminTestimoniesDashboard() {
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchTestimonies();
  }, [filterCategory]);

  const fetchTestimonies = async () => {
    setLoading(true);
    try {
      let url = "/api/testimonies";
      if (filterCategory) {
        url += `?category=${encodeURIComponent(filterCategory)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTestimonies(data);
        
        // Extract unique categories for the filter dropdown
        if (!filterCategory) {
          const uniqueCats = Array.from(new Set(data.map((t: Testimony) => t.category).filter(Boolean))) as string[];
          setCategories(uniqueCats);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, color: "#1e293b" }}>
          Testimonies & Praise Reports
        </h1>
        
        <div style={{ display: "flex", gap: "1rem" }}>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "white",
              outline: "none",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>Loading testimonies...</div>
      ) : testimonies.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", background: "white", borderRadius: "12px", border: "1px dashed #cbd5e1", color: "#64748b" }}>
          No testimonies found for this category.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {testimonies.map((testimony) => {
            const parsedTags = testimony.tags ? JSON.parse(testimony.tags) : [];
            return (
              <div key={testimony.id} style={{ background: "white", borderRadius: "12px", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden", background: "#f1f5f9" }}>
                      {testimony.member.profilePicture ? (
                        <img src={`/uploads/profile_pictures/${testimony.member.profilePicture}`} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>👤</div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: "#1e293b" }}>{testimony.member.firstName} {testimony.member.lastName}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{new Date(testimony.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {testimony.category && (
                      <span style={{ background: "#e0f7fb", color: PRIMARY, padding: "0.25rem 0.75rem", borderRadius: "99px", fontSize: "0.75rem", fontWeight: 700 }}>
                        {testimony.category}
                      </span>
                    )}
                    <Link
                      href={`/admin/testimonies/${testimony.id}/present`}
                      target="_blank"
                      style={{
                        background: PRIMARY, color: "white", textDecoration: "none",
                        padding: "0.4rem 1rem", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600,
                        display: "flex", alignItems: "center", gap: "0.3rem"
                      }}
                    >
                      📺 Present
                    </Link>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                  <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.5rem" }}>Original (Bisaya)</div>
                    <div style={{ fontSize: "0.9375rem", color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{testimony.content}</div>
                  </div>
                  <div style={{ background: "#f0fdfa", padding: "1rem", borderRadius: "8px", border: "1px solid #ccfbf1" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0f766e", textTransform: "uppercase", marginBottom: "0.5rem" }}>AI Translation</div>
                    <div style={{ fontSize: "0.9375rem", color: "#115e59", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {testimony.translatedContent || "No translation available."}
                    </div>
                    {parsedTags.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "1rem" }}>
                        {parsedTags.map((tag: string, i: number) => (
                          <span key={i} style={{ fontSize: "0.75rem", color: "#0f766e", background: "#ccfbf1", padding: "0.2rem 0.6rem", borderRadius: "4px" }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {testimony.photos && testimony.photos.length > 0 && (
                  <div style={{ marginTop: "1rem" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.5rem" }}>Attached Photos</div>
                    <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto" }}>
                      {testimony.photos.map((photo, i) => (
                        <div key={i} style={{ width: "100px", height: "100px", borderRadius: "8px", overflow: "hidden", flexShrink: 0, border: "1px solid #e2e8f0" }}>
                          <img src={`/uploads/testimonies/${photo.photoPath}`} alt="Testimony" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
