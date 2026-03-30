"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Nav } from "@/components/Nav";

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
  id: string; title: string; category: string;
  scheduled_at: string; status: string;
  participant_count: number; is_ticketed: boolean; ticket_price: number;
};

const INITIALS = (n: string) =>
  n.trim().split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
const AVATAR_COLOR = (id: string) => {
  const c = ["#D97706","#059669","#3B82F6","#7C3AED","#EF4444","#EC4899","#0891B2","#65A30D"];
  let h = 0; for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return c[Math.abs(h) % c.length];
};
const sanitise = (s: string) => s.replace(/[<>'"]/g, "").trim();

export default function ProfilePage() {
  const router    = useRouter();
  const params    = useParams();
  const profileId = params.id as string;

  const [profile,      setProfile]      = useState<Profile | null>(null);
  const [rooms,        setRooms]        = useState<Room[]>([]);
  const [currentUser,  setCurrentUser]  = useState<string | null>(null);
  const [isFollowing,  setIsFollowing]  = useState(false);
  const [followLoading,setFollowLoading]= useState(false);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState<"rooms"|"about">("rooms");

  /* ── edit state ── */
  const [editing,       setEditing]       = useState(false);
  const [editName,      setEditName]      = useState("");
  const [editBio,       setEditBio]       = useState("");
  const [editType,      setEditType]      = useState<"listener"|"host">("listener");
  const [editPhoto,     setEditPhoto]     = useState<File|null>(null);
  const [editPreview,   setEditPreview]   = useState<string|null>(null);
  const [editDragOver,  setEditDragOver]  = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── load ── */
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
      if (prof)        setProfile(prof);
      if (hostedRooms) setRooms(hostedRooms);
      if (user) {
        setCurrentUser(user.id);
        const { data: follow } = await supabase.from("follows")
          .select("id").eq("follower_id", user.id).eq("following_id", profileId).maybeSingle();
        setIsFollowing(!!follow);
      }
      setLoading(false);
    };
    if (profileId) load();
  }, [profileId]);

  /* ── follow ── */
  const handleFollow = async () => {
    if (!currentUser) { router.push("/register"); return; }
    setFollowLoading(true);
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", currentUser).eq("following_id", profileId);
      setIsFollowing(false);
      setProfile(p => p ? { ...p, follower_count: Math.max(p.follower_count - 1, 0) } : p);
    } else {
      await supabase.from("follows").insert({ follower_id: currentUser, following_id: profileId });
      setIsFollowing(true);
      setProfile(p => p ? { ...p, follower_count: p.follower_count + 1 } : p);
    }
    setFollowLoading(false);
  };

  /* ── open edit ── */
  const openEdit = () => {
    if (!profile) return;
    setEditName(profile.display_name);
    setEditBio(profile.bio ?? "");
    setEditType(profile.user_type as "listener"|"host");
    setEditPreview(profile.avatar_url);
    setEditPhoto(null);
    setSaveError("");
    setEditing(true);
  };

  /* ── photo drop ── */
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) { alert("Photo must be under 5 MB"); return; }
    setEditPhoto(file);
    const r = new FileReader();
    r.onload = e => setEditPreview(e.target?.result as string);
    r.readAsDataURL(file);
  }, []);

  /* ── save ── */
  const handleSave = async () => {
    const name = sanitise(editName);
    if (!name || name.length < 2) { setSaveError("Name must be at least 2 characters"); return; }
    if (!currentUser) return;
    setSaving(true); setSaveError("");
    try {
      let avatarUrl = profile?.avatar_url ?? null;

      /* Upload new photo if selected */
      if (editPhoto) {
        const ext = editPhoto.name.split(".").pop() ?? "jpg";
        const path = `${currentUser}/avatar.${ext}`;
        const { data: up, error: upErr } = await supabase.storage
          .from("profiles").upload(path, editPhoto, { upsert: true });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("profiles").getPublicUrl(up.path);
        avatarUrl = publicUrl;
      }

      const { error: upErr } = await supabase.from("profiles").update({
        display_name: name,
        bio:          sanitise(editBio),
        user_type:    editType,
        avatar_url:   avatarUrl,
      }).eq("id", currentUser);

      if (upErr) throw upErr;

      setProfile(p => p ? { ...p, display_name: name, bio: sanitise(editBio), user_type: editType, avatar_url: avatarUrl } : p);
      setEditing(false);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  /* ── styles ── */
  const inp: React.CSSProperties = {
    width: "100%", background: "var(--bg2)", border: "1px solid var(--border2)",
    borderRadius: 10, padding: "10px 13px", fontSize: "0.9rem", color: "var(--text)",
    fontFamily: "sans-serif", outline: "none", boxSizing: "border-box" as const,
  };

  if (loading) return (
    <>
      <Nav />
      <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text3)", fontFamily: "sans-serif" }}>Loading profile...</p>
      </div>
    </>
  );

  if (!profile) return (
    <>
      <Nav />
      <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "var(--text)", fontFamily: "sans-serif", marginBottom: "1rem" }}>Profile not found</p>
          <button onClick={() => router.push("/rooms")} style={{ background: "#D97706", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontFamily: "sans-serif" }}>Browse rooms</button>
        </div>
      </div>
    </>
  );

  const isOwnProfile = currentUser === profileId;
  const avatarColor  = AVATAR_COLOR(profile.id);

  return (
    <>
      <Nav />
      <div style={{ background: "var(--bg)", minHeight: "100vh", transition: "background 0.3s" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1.5rem 5rem" }}>

          {/* ── PROFILE HEADER ── */}
          <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap" as const }}>
            {/* Avatar — clickable to change if own profile */}
            <div
              onClick={() => isOwnProfile && fileRef.current?.click()}
              style={{ position: "relative", cursor: isOwnProfile ? "pointer" : "default", flexShrink: 0 }}
              title={isOwnProfile ? "Click to change photo" : ""}
            >
              <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", background: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", fontWeight: 700, color: "#fff", fontFamily: "sans-serif", border: "3px solid var(--bg)", outline: `2px solid ${avatarColor}` }}>
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt={profile.display_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : INITIALS(profile.display_name)}
              </div>
              {isOwnProfile && (
                <div style={{ position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: "50%", background: "#D97706", border: "2px solid var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </div>
              )}
              {/* Hidden quick-upload input on avatar */}
              {isOwnProfile && (
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) {
                      handleFile(f);
                      // Auto-save immediately on avatar tap
                      setEditing(true);
                    }
                  }}
                />
              )}
            </div>

            {/* Name + meta */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const, marginBottom: "0.3rem" }}>
                <h1 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text)", margin: 0, fontFamily: "sans-serif" }}>{profile.display_name}</h1>
                <span style={{ background: "rgba(217,119,6,0.1)", color: "#D97706", border: "0.5px solid rgba(217,119,6,0.3)", borderRadius: 100, padding: "2px 8px", fontSize: "0.68rem", fontWeight: 600, fontFamily: "sans-serif", textTransform: "capitalize" }}>{profile.user_type}</span>
              </div>
              {profile.bio && <p style={{ fontSize: "0.85rem", color: "var(--text2)", lineHeight: 1.6, marginBottom: "0.75rem", fontFamily: "sans-serif" }}>{profile.bio}</p>}
              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" as const }}>
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

          {/* ── ACTIONS ── */}
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem", flexWrap: "wrap" as const }}>
            {isOwnProfile ? (
              <>
                <button onClick={openEdit} style={{ background: "#D97706", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" }}>
                  ✏️ Edit profile
                </button>
                <button onClick={() => router.push("/rooms/create")} style={{ background: "transparent", color: "var(--text2)", border: "0.5px solid var(--border2)", borderRadius: 8, padding: "8px 16px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "sans-serif" }}>
                  + Start a room
                </button>
                {profile.user_type === "host" && (
                  <button onClick={() => router.push("/dashboard")} style={{ background: "transparent", color: "var(--text2)", border: "0.5px solid var(--border2)", borderRadius: 8, padding: "8px 16px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "sans-serif" }}>
                    Dashboard
                  </button>
                )}
              </>
            ) : (
              <button onClick={handleFollow} disabled={followLoading} style={{
                background: isFollowing ? "transparent" : "#D97706",
                color: isFollowing ? "var(--text2)" : "#fff",
                border: `0.5px solid ${isFollowing ? "var(--border2)" : "#D97706"}`,
                borderRadius: 8, padding: "8px 20px", fontSize: "0.85rem",
                fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif",
              }}>
                {followLoading ? "..." : isFollowing ? "Following ✓" : "+ Follow"}
              </button>
            )}
          </div>

          {/* ── TABS ── */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--divider)", marginBottom: "1.5rem" }}>
            {(["rooms","about"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{
                padding: "0.6rem 1.25rem", background: "none", border: "none",
                borderBottom: `2px solid ${activeTab === t ? "#D97706" : "transparent"}`,
                color: activeTab === t ? "#D97706" : "var(--text3)",
                fontSize: "0.85rem", fontWeight: activeTab === t ? 600 : 400,
                cursor: "pointer", fontFamily: "sans-serif", textTransform: "capitalize",
                marginBottom: -1, transition: "color 0.2s",
              }}>{t}</button>
            ))}
          </div>

          {/* ── ROOMS TAB ── */}
          {activeTab === "rooms" && (
            rooms.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", background: "var(--bg2)", borderRadius: 10, border: "0.5px solid var(--border)" }}>
                <p style={{ color: "var(--text3)", fontFamily: "sans-serif", fontSize: "0.85rem" }}>
                  {isOwnProfile ? "You haven't hosted any rooms yet." : "No rooms hosted yet."}
                </p>
                {isOwnProfile && (
                  <button onClick={() => router.push("/rooms/create")} style={{ marginTop: "0.75rem", background: "#D97706", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" }}>
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
                      <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif" }}>{room.title}</div>
                      <span style={{
                        background: room.status === "live" ? "rgba(5,150,105,0.12)" : room.status === "ended" ? "var(--bg2)" : "rgba(217,119,6,0.12)",
                        color: room.status === "live" ? "#059669" : room.status === "ended" ? "var(--text3)" : "#D97706",
                        border: `0.5px solid ${room.status === "live" ? "rgba(5,150,105,0.3)" : room.status === "ended" ? "var(--border)" : "rgba(217,119,6,0.3)"}`,
                        borderRadius: 100, padding: "2px 7px", fontSize: "0.62rem",
                        fontWeight: 600, whiteSpace: "nowrap", fontFamily: "sans-serif",
                      }}>{room.status === "live" ? "Live now" : room.status === "ended" ? "Ended" : "Scheduled"}</span>
                    </div>
                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" as const }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{fmtDate(room.scheduled_at)}</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{room.participant_count} listeners</span>
                      <span style={{ display: "inline-block", background: "var(--bg2)", color: "var(--text3)", border: "0.5px solid var(--border)", borderRadius: 100, padding: "1px 7px", fontSize: "0.62rem", fontFamily: "sans-serif", textTransform: "capitalize" }}>{room.category}</span>
                      {room.is_ticketed && <span style={{ fontSize: "0.72rem", color: "#D97706", fontFamily: "sans-serif", fontWeight: 600 }}>USD ${room.ticket_price.toFixed(2)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── ABOUT TAB ── */}
          {activeTab === "about" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[
                { label: "Display name",  value: profile.display_name },
                { label: "Role",          value: profile.user_type, cap: true },
                { label: "Bio",           value: profile.bio || "No bio yet." },
                { label: "Member since",  value: new Date(profile.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) },
              ].map(item => (
                <div key={item.label} style={{ padding: "0.9rem 1rem", background: "var(--bg2)", borderRadius: 8, border: "0.5px solid var(--border)" }}>
                  <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--text3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.3rem", fontFamily: "sans-serif" }}>{item.label}</div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text)", fontFamily: "sans-serif", textTransform: item.cap ? "capitalize" : "none" }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── EDIT MODAL ── */}
      {editing && (
        <div onClick={e => { if ((e.target as HTMLElement).id === "edit-bg") setEditing(false); }} id="edit-bg"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 0 }}>
          <div style={{ background: "var(--bg)", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 520, padding: "1.5rem 1.5rem 2.5rem", maxHeight: "90vh", overflowY: "auto" }}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif", margin: 0 }}>Edit profile</h2>
              <button onClick={() => setEditing(false)} style={{ background: "var(--bg2)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", color: "var(--text2)", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>

            {/* Avatar preview + upload */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", overflow: "hidden", background: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", fontWeight: 700, color: "#fff", fontFamily: "sans-serif", flexShrink: 0 }}>
                {editPreview
                  ? <img src={editPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : INITIALS(editName || profile.display_name)}
              </div>
              <div>
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setEditDragOver(true); }}
                  onDragLeave={() => setEditDragOver(false)}
                  onDrop={e => { e.preventDefault(); setEditDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                  style={{ border: `2px dashed ${editDragOver ? "#D97706" : "var(--border2)"}`, borderRadius: 10, padding: "0.65rem 1rem", cursor: "pointer", background: editDragOver ? "rgba(217,119,6,0.05)" : "var(--bg2)", transition: "all 0.2s" }}
                >
                  <p style={{ fontSize: "0.78rem", color: "var(--text3)", fontFamily: "sans-serif", margin: 0 }}>
                    {editPhoto ? "✓ New photo ready" : "Click or drag to change photo"}
                  </p>
                </div>
                {editPhoto && <button onClick={() => { setEditPhoto(null); setEditPreview(profile.avatar_url); }} style={{ marginTop: 4, background: "none", border: "none", color: "#EF4444", fontSize: "0.75rem", cursor: "pointer", fontFamily: "sans-serif" }}>Remove</button>}
              </div>
            </div>

            {/* Display name */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", fontFamily: "sans-serif", marginBottom: 5 }}>
                Display name <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <input style={inp} maxLength={50} value={editName} onChange={e => setEditName(sanitise(e.target.value))} placeholder="Your name" />
              <div style={{ fontSize: "0.68rem", color: "var(--text3)", fontFamily: "sans-serif", textAlign: "right", marginTop: 3 }}>{editName.length}/50</div>
            </div>

            {/* Bio */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", fontFamily: "sans-serif", marginBottom: 5 }}>Bio</label>
              <textarea style={{ ...inp, resize: "vertical" as const, minHeight: 80 }} maxLength={200} value={editBio} onChange={e => setEditBio(sanitise(e.target.value))} placeholder="Tell the community about yourself..." />
              <div style={{ fontSize: "0.68rem", color: "var(--text3)", fontFamily: "sans-serif", textAlign: "right", marginTop: 3 }}>{editBio.length}/200</div>
            </div>

            {/* Role */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", fontFamily: "sans-serif", marginBottom: 8 }}>Role</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {(["listener","host"] as const).map(t => (
                  <button key={t} onClick={() => setEditType(t)} style={{
                    padding: "12px 10px", borderRadius: 10, cursor: "pointer", textAlign: "left" as const,
                    background: editType === t ? "rgba(217,119,6,0.08)" : "var(--bg2)",
                    border: `1.5px solid ${editType === t ? "#D97706" : "var(--border2)"}`,
                  }}>
                    <div style={{ fontSize: "1rem", marginBottom: 3 }}>{t === "listener" ? "🎧" : "🎙️"}</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: editType === t ? "#D97706" : "var(--text)", fontFamily: "sans-serif", textTransform: "capitalize" }}>{t}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{t === "listener" ? "Join & participate" : "Host & earn"}</div>
                  </button>
                ))}
              </div>
            </div>

            {saveError && <p style={{ fontSize: "0.78rem", color: "#EF4444", fontFamily: "sans-serif", marginBottom: "0.75rem" }}>{saveError}</p>}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setEditing(false)} style={{ flex: 1, background: "var(--bg2)", border: "0.5px solid var(--border2)", borderRadius: 10, padding: "12px", fontSize: "0.9rem", cursor: "pointer", fontFamily: "sans-serif", color: "var(--text2)" }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, background: "#D97706", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: "0.9rem", fontWeight: 700, cursor: saving ? "default" : "pointer", fontFamily: "sans-serif", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
