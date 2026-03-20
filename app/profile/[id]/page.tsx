"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ThemeToggle";

type Profile = {
  id: string;
  display_name: string;
  bio: string | null;
  user_type: string;
  avatar_url: string | null;
  follower_count: number;
  following_count: number;
  created_at: string;
};

type Room = {
  id: string;
  title: string;
  category: string;
  scheduled_at: string;
  status: string;
  participant_count: number;
  is_ticketed: boolean;
  ticket_price: number;
};

const INITIALS = (name: string) =>
  name.trim().split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

const AVATAR_COLOR = (id: string) => {
  const colors = ["#D97706","#059669","#3B82F6","#7C3AED","#EF4444","#EC4899","#0891B2","#65A30D"];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params.id as string;

  const [profile,    setProfile]    = useState<Profile | null>(null);
  const [rooms,      setRooms]      = useState<Room[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState<"rooms" | "about">("rooms");

  useEffect(() => {
    const load = async () => {
      const [{ data: { user } }, { data: prof }, { data: hostedRooms }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("profiles").select("*").eq("id", profileId).single(),
        supabase.from("rooms")
          .select("id,title,category,scheduled_at,status,participant_count,is_ticketed,ticket_price")
          .eq("host_id", profileId)
          .order("scheduled_at", { ascending: false })
          .limit(20),
      ]);

      if (prof)         setProfile(prof);
      if (hostedRooms)  setRooms(hostedRooms);
      if (user) {
        setCurrentUser(user.id);
        const { data: follow } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", profileId)
          .maybeSingle();
        setIsFollowing(!!follow);
      }
      setLoading(false);
    };
    if (profileId) load();
  }, [profileId]);

  const handleFollow = async () => {
    if (!currentUser) { router.push("/register"); return; }
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase.from("follows").delete()
          .eq("follower_id", currentUser).eq("following_id", profileId);
        setIsFollowing(false);
        setProfile(p => p ? { ...p, follower_count: Math.max(p.follower_count - 1, 0) } : p);
      } else {
        await supabase.from("follows").insert({ follower_id: currentUser, following_id: profileId });
        setIsFollowing(true);
        setProfile(p => p ? { ...p, follower_count: p.follower_count + 1 } : p);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  if (loading) return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "var(--text3)", fontFamily: "sans-serif", fontSize: "0.85rem" }}>Loading profile...</p>
    </div>
  );

  if (!profile) return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "var(--text)", fontFamily: "sans-serif", fontSize: "1rem", marginBottom: "1rem" }}>Profile not found</p>
        <button onClick={() => router.push("/rooms")} style={{ background: "#D97706", color: "#fff", border: "none", borderRadius: 5, padding: "8px 16px", cursor: "pointer", fontFamily: "sans-serif" }}>Browse rooms</button>
      </div>
    </div>
  );

  const isOwnProfile = currentUser === profileId;
  const avatarColor  = AVATAR_COLOR(profile.id);

  return (
    <>
      {/* NAV */}
      <nav style={{ background: "var(--bg)", borderBottom: "1px solid var(--divider)", padding: "0.9rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50, transition: "background 0.3s" }}>
        <div style={{ cursor: "pointer" }} onClick={() => router.push("/")}>
          <div style={{ color: "#D97706", fontSize: "1rem", fontWeight: 700, lineHeight: 1.1 }}>DARE</div>
          <div style={{ color: "var(--text3)", fontSize: "0.68rem", fontFamily: "sans-serif" }}>The Digital Council</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <ThemeToggle />
          <button onClick={() => router.back()} style={{ background: "none", border: "0.5px solid var(--border2)", borderRadius: 5, padding: "6px 12px", fontSize: "0.8rem", color: "var(--text2)", cursor: "pointer", fontFamily: "sans-serif" }}>← Back</button>
        </div>
      </nav>

      <div style={{ background: "var(--bg)", minHeight: "100vh", transition: "background 0.3s" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1.5rem 5rem" }}>

          {/* ── PROFILE HEADER ── */}
          <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start", marginBottom: "1.75rem", flexWrap: "wrap" }}>
            {/* Avatar */}
            <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", fontWeight: 700, color: "#fff", fontFamily: "sans-serif", border: "3px solid var(--bg)", outline: `2px solid ${avatarColor}` }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.display_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : INITIALS(profile.display_name)}
            </div>

            {/* Name + meta */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: "0.3rem" }}>
                <h1 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text)", margin: 0 }}>{profile.display_name}</h1>
                <span style={{ background: "rgba(217,119,6,0.1)", color: "#D97706", border: "0.5px solid rgba(217,119,6,0.3)", borderRadius: 100, padding: "2px 8px", fontSize: "0.68rem", fontWeight: 600, fontFamily: "sans-serif", textTransform: "capitalize" }}>{profile.user_type}</span>
              </div>

              {profile.bio && (
                <p style={{ fontSize: "0.85rem", color: "var(--text2)", lineHeight: 1.6, marginBottom: "0.75rem", fontFamily: "sans-serif" }}>{profile.bio}</p>
              )}

              {/* Stats row */}
              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                {[
                  { val: profile.follower_count,  label: "followers" },
                  { val: profile.following_count, label: "following" },
                  { val: rooms.length,            label: "rooms" },
                ].map(s => (
                  <div key={s.label}>
                    <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif" }}>{s.val}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text3)", fontFamily: "sans-serif", marginLeft: 4 }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── ACTION BUTTONS ── */}
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem", flexWrap: "wrap" }}>
            {isOwnProfile ? (
              <>
                <button onClick={() => router.push("/rooms/create")} style={{ background: "#D97706", color: "#fff", border: "none", borderRadius: 5, padding: "8px 16px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" }}>
                  + Start a room
                </button>
                <button onClick={() => router.push("/dashboard")} style={{ background: "transparent", color: "var(--text2)", border: "0.5px solid var(--border2)", borderRadius: 5, padding: "8px 16px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "sans-serif" }}>
                  Dashboard
                </button>
              </>
            ) : (
              <button onClick={handleFollow} disabled={followLoading} style={{
                background: isFollowing ? "transparent" : "#D97706",
                color: isFollowing ? "var(--text2)" : "#fff",
                border: `0.5px solid ${isFollowing ? "var(--border2)" : "#D97706"}`,
                borderRadius: 5, padding: "8px 20px", fontSize: "0.85rem",
                fontWeight: 600, cursor: followLoading ? "default" : "pointer",
                fontFamily: "sans-serif", transition: "all 0.2s", minWidth: 100,
              }}>
                {followLoading ? "..." : isFollowing ? "Following ✓" : "+ Follow"}
              </button>
            )}
          </div>

          {/* ── TABS ── */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--divider)", marginBottom: "1.5rem" }}>
            {(["rooms", "about"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: "0.6rem 1.25rem", background: "none", border: "none",
                borderBottom: `2px solid ${activeTab === tab ? "#D97706" : "transparent"}`,
                color: activeTab === tab ? "#D97706" : "var(--text3)",
                fontSize: "0.85rem", fontWeight: activeTab === tab ? 600 : 400,
                cursor: "pointer", fontFamily: "sans-serif", textTransform: "capitalize",
                transition: "color 0.2s, border-color 0.2s", marginBottom: -1,
              }}>{tab}</button>
            ))}
          </div>

          {/* ── ROOMS TAB ── */}
          {activeTab === "rooms" && (
            <div>
              {rooms.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem 1rem", background: "var(--bg2)", borderRadius: 10, border: "0.5px solid var(--border)" }}>
                  <p style={{ color: "var(--text3)", fontFamily: "sans-serif", fontSize: "0.85rem" }}>
                    {isOwnProfile ? "You haven't hosted any rooms yet." : "No rooms hosted yet."}
                  </p>
                  {isOwnProfile && (
                    <button onClick={() => router.push("/rooms/create")} style={{ marginTop: "0.75rem", background: "#D97706", color: "#fff", border: "none", borderRadius: 5, padding: "8px 16px", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" }}>
                      Start your first room
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {rooms.map(room => (
                    <div key={room.id} onClick={() => router.push(`/rooms/${room.id}`)}
                      style={{ background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "1rem 1.25rem", cursor: "pointer", transition: "border-color 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "#D97706")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.35rem" }}>
                        <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>{room.title}</div>
                        <span style={{
                          background: room.status === "live" ? "rgba(5,150,105,0.12)" : room.status === "ended" ? "var(--bg2)" : "rgba(217,119,6,0.12)",
                          color: room.status === "live" ? "#059669" : room.status === "ended" ? "var(--text3)" : "#D97706",
                          border: `0.5px solid ${room.status === "live" ? "rgba(5,150,105,0.3)" : room.status === "ended" ? "var(--border)" : "rgba(217,119,6,0.3)"}`,
                          borderRadius: 100, padding: "2px 7px", fontSize: "0.62rem",
                          fontWeight: 600, whiteSpace: "nowrap", fontFamily: "sans-serif",
                        }}>
                          {room.status === "live" ? "Live now" : room.status === "ended" ? "Ended" : "Scheduled"}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{formatDate(room.scheduled_at)}</span>
                        <span style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{room.participant_count} listeners</span>
                        <span style={{ display: "inline-block", background: "var(--bg2)", color: "var(--text3)", border: "0.5px solid var(--border)", borderRadius: 100, padding: "1px 7px", fontSize: "0.62rem", fontFamily: "sans-serif", textTransform: "capitalize" }}>{room.category}</span>
                        {room.is_ticketed && (
                          <span style={{ fontSize: "0.72rem", color: "#D97706", fontFamily: "sans-serif", fontWeight: 600 }}>USD ${room.ticket_price.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ABOUT TAB ── */}
          {activeTab === "about" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[
                { label: "Display name",  value: profile.display_name },
                { label: "Role",          value: profile.user_type, capitalize: true },
                { label: "Bio",           value: profile.bio || "No bio yet." },
                { label: "Member since",  value: new Date(profile.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) },
              ].map(item => (
                <div key={item.label} style={{ padding: "0.9rem 1rem", background: "var(--bg2)", borderRadius: 8, border: "0.5px solid var(--border)" }}>
                  <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--text3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.3rem", fontFamily: "sans-serif" }}>{item.label}</div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text)", fontFamily: "sans-serif", textTransform: item.capitalize ? "capitalize" : "none" }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
