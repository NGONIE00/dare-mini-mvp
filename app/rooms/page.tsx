"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Nav } from "@/components/Nav";

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
  is_featured: boolean;
  is_recording: boolean;
  host_id: string;
  profiles: { id: string; display_name: string } | null;
};

export default function Rooms() {
  const router  = useRouter();
  const [rooms,   setRooms]   = useState<Room[]>([]);
  const [filter,  setFilter]  = useState("All");
  const [loading,   setLoading]   = useState(true);
  const [aiRecs,    setAiRecs]    = useState<string[]>([]);
  const [recsLoaded,setRecsLoaded]= useState(false);

  useEffect(() => {
    const fetchRooms = async () => {
      /* Sync room statuses first (scheduled→live, live→ended) */
      await supabase.rpc("sync_room_statuses");

      const { data, error } = await supabase
        .from("rooms")
        .select("*, profiles(id, display_name)")
        .in("status", ["scheduled", "live"])
        .order("is_featured", { ascending: false })
        .order("scheduled_at", { ascending: true });

      if (error) console.error("Rooms fetch error:", error.message, error.code);
      if (data) setRooms(data);
      setLoading(false);

      /* AI recommendations — fetch user profile for personalisation */
      const { data: { user } } = await supabase.auth.getUser();
      if (user && data && data.length > 0) {
        const { data: prof } = await supabase.from("profiles").select("user_type").eq("id", user.id).single();
        const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id).limit(10);
        const { data: recentParts } = await supabase.from("room_participants").select("room_id").eq("user_id", user.id).order("joined_at", { ascending: false }).limit(5);

        try {
          const res = await fetch("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              feature: "recommend_rooms",
              payload: {
                user_type: prof?.user_type ?? "listener",
                followed_categories: [],
                recent_rooms: (recentParts ?? []).map((r: { room_id: string }) => r.room_id),
                all_rooms: data.map(r => ({ id: r.id, title: r.title, category: r.category, status: r.status, participant_count: r.participant_count })),
              },
            }),
          });
          const { result } = await res.json();
          const ids: string[] = JSON.parse(result);
          setAiRecs(ids);
          setRecsLoaded(true);
        } catch { /* silent */ }
      }
    };
    fetchRooms();

    /* Realtime: update room cards when status or participant_count changes */
    const channel = supabase
      .channel("rooms-list")
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "rooms",
      }, (payload: { new: Room & { host_id: string } }) => {
        setRooms(prev => prev.map(r =>
          r.id === payload.new.id
            ? { ...r, status: payload.new.status, participant_count: payload.new.participant_count }
            : r
        ));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = filter === "All"
    ? rooms
    : rooms.filter(r => r.category === filter.toLowerCase());

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <Nav />

      <div style={{ background: "var(--bg)", minHeight: "100vh", transition: "background 0.3s" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 2rem 5rem" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h1 style={{ fontSize: "clamp(1.4rem,3vw,1.9rem)", fontWeight: 700, color: "var(--text)", marginBottom: "0.3rem" }}>Browse rooms</h1>
              <p style={{ fontSize: "0.85rem", color: "var(--text2)", fontFamily: "sans-serif" }}>
                Join a live session or find something upcoming.
              </p>
            </div>
            <button
              onClick={() => router.push("/rooms/create")}
              style={{ background: "#D97706", color: "#fff", padding: "8px 16px", borderRadius: 5, border: "none", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif", flexShrink: 0 }}
            >
              + Start a room
            </button>
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

          {/* ── Featured / Pinned room ── */}
          {rooms.filter(r => r.is_featured).map(room => (
            <div key={room.id} onClick={() => router.push(`/rooms/${room.id}`)}
              style={{ background: "rgba(217,119,6,0.05)", border: "1.5px solid #D97706", borderRadius: 12, padding: "1rem 1.25rem", cursor: "pointer", marginBottom: "1.25rem", position: "relative", overflow: "hidden" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,119,6,0.09)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(217,119,6,0.05)")}>
              {/* Featured badge */}
              <div style={{ position: "absolute", top: 12, right: 12, background: "#D97706", color: "#fff", borderRadius: 100, padding: "2px 9px", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "sans-serif" }}>
                📌 Featured
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.5rem" }}>
                <span style={{ background: room.status === "live" ? "rgba(5,150,105,0.12)" : "rgba(217,119,6,0.12)", color: room.status === "live" ? "#059669" : "#D97706", border: `0.5px solid ${room.status === "live" ? "rgba(5,150,105,0.3)" : "rgba(217,119,6,0.3)"}`, borderRadius: 100, padding: "2px 8px", fontSize: "0.62rem", fontWeight: 600, fontFamily: "sans-serif" }}>
                  {room.status === "live" ? "● Live now" : "○ Starting soon"}
                </span>
                {room.is_recording && <span style={{ fontSize: "0.62rem", color: "#EF4444", fontFamily: "sans-serif", fontWeight: 600 }}>⏺ Recording</span>}
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text)", fontFamily: "sans-serif", marginBottom: "0.35rem", paddingRight: 80 }}>{room.title}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text2)", fontFamily: "sans-serif", lineHeight: 1.6, marginBottom: "0.5rem" }}>{room.description?.slice(0, 120)}{(room.description?.length ?? 0) > 120 ? "…" : ""}</div>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif" }}>Hosted by {room.profiles?.display_name}</span>
                <span style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{room.participant_count} listening</span>
              </div>
            </div>
          ))}

          {/* ── AI Recommended ── */}
          {recsLoaded && aiRecs.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#D97706", fontFamily: "sans-serif" }}>✨ Recommended for you</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {rooms.filter(r => aiRecs.includes(r.id)).slice(0, 3).map(room => (
                  <div key={room.id} onClick={() => router.push(`/rooms/${room.id}`)}
                    style={{ background: "rgba(217,119,6,0.04)", border: "1px solid rgba(217,119,6,0.2)", borderRadius: 10, padding: "0.9rem 1.25rem", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#D97706")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(217,119,6,0.2)")}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{room.title}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text3)", fontFamily: "sans-serif", marginTop: 2 }}>{room.profiles?.display_name} · {room.participant_count} listening</div>
                    </div>
                    <span style={{ background: room.status === "live" ? "rgba(5,150,105,0.12)" : "rgba(217,119,6,0.12)", color: room.status === "live" ? "#059669" : "#D97706", border: `0.5px solid ${room.status === "live" ? "rgba(5,150,105,0.3)" : "rgba(217,119,6,0.3)"}`, borderRadius: 100, padding: "2px 8px", fontSize: "0.62rem", fontWeight: 600, whiteSpace: "nowrap" as const, fontFamily: "sans-serif", flexShrink: 0 }}>
                      {room.status === "live" ? "Live" : "Soon"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Room list */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text3)", fontFamily: "sans-serif", fontSize: "0.85rem" }}>
              Loading rooms...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--bg2)", borderRadius: 12, border: "0.5px solid var(--border)" }}>
              <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.5rem", fontFamily: "sans-serif" }}>No rooms yet</div>
              <p style={{ fontSize: "0.85rem", color: "var(--text2)", fontFamily: "sans-serif", marginBottom: "1.25rem" }}>
                Be the first to start a room in this category.
              </p>
              <button onClick={() => router.push("/rooms/create")} style={{ background: "#D97706", color: "#fff", border: "none", borderRadius: 5, padding: "8px 18px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" }}>
                + Start a room
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {filtered.map(room => (
                <div
                  key={room.id}
                  onClick={() => router.push(`/rooms/${room.id}`)}
                  style={{ background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "1.1rem 1.25rem", cursor: "pointer", transition: "border-color 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#D97706")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.4rem" }}>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif" }}>{room.title}</div>
                    <span style={{
                      background: room.status === "live" ? "rgba(5,150,105,0.12)" : "rgba(217,119,6,0.12)",
                      color: room.status === "live" ? "#059669" : "#D97706",
                      border: `0.5px solid ${room.status === "live" ? "rgba(5,150,105,0.3)" : "rgba(217,119,6,0.3)"}`,
                      borderRadius: 100, padding: "2px 8px", fontSize: "0.65rem",
                      fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, fontFamily: "sans-serif",
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
                    {/* Host — clickable to profile */}
                    <span
                      onClick={e => { e.stopPropagation(); if (room.profiles?.id) router.push(`/profile/${room.profiles.id}`); }}
                      style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif", cursor: room.profiles?.id ? "pointer" : "default", textDecoration: room.profiles?.id ? "underline" : "none", textDecorationColor: "var(--border2)" }}
                    >
                      {room.profiles?.display_name ?? "Unknown"}
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
                    <span style={{ display: "inline-block", background: "var(--bg2)", color: "var(--text3)", border: "0.5px solid var(--border)", borderRadius: 100, padding: "1px 7px", fontSize: "0.65rem", fontFamily: "sans-serif", textTransform: "capitalize" }}>
                      {room.category}
                    </span>
                  </div>
                  <div style={{ marginTop: "0.75rem" }}>
                    <button
                      onClick={e => { e.stopPropagation(); router.push(`/rooms/${room.id}`); }}
                      style={{
                        background: room.status === "live" ? "#D97706" : "transparent",
                        color: room.status === "live" ? "#fff" : "var(--text2)",
                        border: room.status === "live" ? "none" : "0.5px solid var(--border2)",
                        borderRadius: 6, padding: "7px 18px", fontSize: "0.8rem",
                        fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif",
                        transition: "background 0.2s",
                      }}
                    >
                      {room.status === "live" ? "Join now →" : room.status === "ended" ? "View recap" : "View room →"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
