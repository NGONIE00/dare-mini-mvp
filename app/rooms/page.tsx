export const dynamic = "force-dynamic";

"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ThemeToggle";

const FILTERS = ["All", "Health", "Agriculture", "Education", "News", "Community", "Entertainment", "Tech", "General"];

type Room = {
  id: string;
  title: string;
  description: string;
  category: string;
  language: string;
  scheduled_at: string;
  duration_minutes: number;
  is_ticketed: boolean;
  ticket_price: number;
  status: string;
  participant_count: number;
  profiles: { display_name: string } | null;
};

export default function Rooms() {
  const router  = useRouter();
  const [rooms,  setRooms]  = useState<Room[]>([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*, profiles(display_name)")
        .in("status", ["scheduled", "live"])
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true });

      if (!error && data) setRooms(data);
      setLoading(false);
    };
    fetchRooms();
  }, []);

  const filtered = filter === "All" ? rooms : rooms.filter(r => r.category === filter.toLowerCase());

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      {/* NAV */}
      <nav style={{ background: "var(--bg)", borderBottom: "1px solid var(--divider)", padding: "0.9rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50, transition: "background 0.3s" }}>
        <div>
          <div style={{ color: "#D97706", fontSize: "1rem", fontWeight: 700, lineHeight: 1.1 }}>DARE</div>
          <div style={{ color: "var(--text3)", fontSize: "0.68rem", fontFamily: "sans-serif" }}>The Digital Council</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <ThemeToggle />
          <button onClick={() => router.push("/rooms/create")} style={{ background: "#D97706", color: "#fff", padding: "6px 14px", borderRadius: 5, border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" }}>
            + Start a room
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 2rem 5rem" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "clamp(1.4rem,3vw,1.9rem)", fontWeight: 700, color: "var(--text)", marginBottom: "0.3rem" }}>Browse rooms</h1>
            <p style={{ fontSize: "0.85rem", color: "var(--text2)", fontFamily: "sans-serif" }}>Join a live session or find something upcoming.</p>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "1.75rem" }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? "rgba(217,119,6,0.12)" : "var(--bg2)",
              border: `0.5px solid ${filter === f ? "#D97706" : "var(--border2)"}`,
              borderRadius: 100, padding: "5px 13px", fontSize: "0.75rem",
              cursor: "pointer", fontFamily: "sans-serif",
              color: filter === f ? "#D97706" : "var(--text2)",
              fontWeight: filter === f ? 600 : 400, transition: "all 0.15s",
            }}>{f}</button>
          ))}
        </div>

        {/* Room list */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text3)", fontFamily: "sans-serif", fontSize: "0.85rem" }}>Loading rooms...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--bg2)", borderRadius: 12, border: "0.5px solid var(--border)" }}>
            <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.5rem" }}>No rooms yet</div>
            <p style={{ fontSize: "0.85rem", color: "var(--text2)", fontFamily: "sans-serif", marginBottom: "1.25rem" }}>Be the first to start a room in this category.</p>
            <button onClick={() => router.push("/rooms/create")} style={{ background: "#D97706", color: "#fff", border: "none", borderRadius: 5, padding: "8px 18px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" }}>
              + Start a room
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {filtered.map(room => (
              <div key={room.id} onClick={() => router.push(`/rooms/${room.id}`)} style={{ background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "1.1rem 1.25rem", cursor: "pointer", transition: "border-color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#D97706")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.4rem" }}>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)" }}>{room.title}</div>
                  <span style={{
                    background: room.status === "live" ? "rgba(5,150,105,0.12)" : "rgba(217,119,6,0.12)",
                    color: room.status === "live" ? "#059669" : "#D97706",
                    border: `0.5px solid ${room.status === "live" ? "rgba(5,150,105,0.3)" : "rgba(217,119,6,0.3)"}`,
                    borderRadius: 100, padding: "2px 8px", fontSize: "0.65rem", fontWeight: 600,
                    whiteSpace: "nowrap", flexShrink: 0, fontFamily: "sans-serif",
                  }}>
                    {room.status === "live" ? "Live now" : "Scheduled"}
                  </span>
                </div>
                {room.description && (
                  <p style={{ fontSize: "0.8rem", color: "var(--text2)", fontFamily: "sans-serif", lineHeight: 1.5, marginBottom: "0.6rem" }}>
                    {room.description.slice(0, 120)}{room.description.length > 120 ? "..." : ""}
                  </p>
                )}
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif" }}>
                    Host: {room.profiles?.display_name ?? "Unknown"}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif" }}>
                    {formatDate(room.scheduled_at)} · {formatTime(room.scheduled_at)}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif" }}>
                    {room.participant_count} listeners
                  </span>
                  {room.is_ticketed && (
                    <span style={{ fontSize: "0.72rem", color: "#D97706", fontFamily: "sans-serif", fontWeight: 600 }}>
                      USD ${room.ticket_price.toFixed(2)}
                    </span>
                  )}
                  <span style={{ display: "inline-block", background: "var(--bg2)", color: "var(--text3)", border: "0.5px solid var(--border)", borderRadius: 100, padding: "1px 7px", fontSize: "0.65rem", fontFamily: "sans-serif" }}>
                    {room.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
