"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "./ThemeToggle";

type Notification = {
  id: string; type: string; message: string;
  room_id: string | null; read: boolean; created_at: string;
};

export function Nav({ showBack = false }: { showBack?: boolean }) {
  const router = useRouter();

  const [notifications,  setNotifications]  = useState<Notification[]>([]);
  const [bellOpen,       setBellOpen]       = useState(false);
  const [userId,         setUserId]         = useState<string | null>(null);
  const [userType,       setUserType]       = useState<string | null>(null);
  const [userMenuOpen,   setUserMenuOpen]   = useState(false);
  const [deleteOpen,     setDeleteOpen]     = useState(false);
  const [deleteConfirm,  setDeleteConfirm]  = useState("");
  const [deleting,       setDeleting]       = useState(false);
  const [deleteError,    setDeleteError]    = useState("");

  const bellRef    = useRef<HTMLDivElement>(null);
  const menuRef    = useRef<HTMLDivElement>(null);
  const unread     = notifications.filter(n => !n.read).length;

  /* ── load user + notifications ── */
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: prof } = await supabase.from("profiles")
        .select("user_type").eq("id", user.id).single();
      if (prof) setUserType(prof.user_type);

      const { data: notifs } = await supabase.from("notifications")
        .select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(20);
      if (notifs) setNotifications(notifs);

      const channel = supabase.channel("nav-notifications")
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "notifications",
          filter: `user_id=eq.${user.id}`,
        }, (payload: { new: Notification }) => {
          setNotifications(prev => [payload.new, ...prev]);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };
    load();
  }, []);

  /* ── close dropdowns on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = async () => {
    if (!userId) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotifClick = async (notif: Notification) => {
    if (!notif.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    }
    if (notif.room_id) router.push(`/rooms/${notif.room_id}`);
    setBellOpen(false);
  };

  const timeAgo = (d: string) => {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60)    return "just now";
    if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserId(null); setUserType(null); setUserMenuOpen(false);
    router.push("/");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm.toLowerCase() !== "delete") {
      setDeleteError('Type "delete" to confirm'); return;
    }
    setDeleting(true); setDeleteError("");
    try {
      const { error } = await supabase.rpc("delete_user_account");
      if (error) throw error;
      await supabase.auth.signOut();
      setUserId(null); setUserType(null);
      setDeleteOpen(false);
      router.push("/");
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete account");
      setDeleting(false);
    }
  };

  /* ── shared styles ── */
  const menuBtn: React.CSSProperties = {
    width: "100%", display: "flex", alignItems: "center", gap: 8,
    padding: "10px 14px", background: "none", border: "none",
    cursor: "pointer", fontSize: "0.82rem", color: "var(--text)",
    fontFamily: "sans-serif", textAlign: "left" as const,
  };

  return (
    <>
      {/* ── NAV BAR ── */}
      <nav style={{ background: "var(--bg)", borderBottom: "1px solid var(--divider)", padding: "0.9rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50, transition: "background 0.3s" }}>

        {/* Brand */}
        <div style={{ cursor: "pointer" }} onClick={() => router.push("/")}>
          <div style={{ color: "#D97706", fontSize: "1rem", fontWeight: 700, lineHeight: 1.1 }}>DARE</div>
          <div style={{ color: "var(--text3)", fontSize: "0.68rem", fontFamily: "sans-serif" }}>The Digital Council</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <ThemeToggle />

          {/* Bell */}
          <div ref={bellRef} style={{ position: "relative" }}>
            <button onClick={() => { setBellOpen(v => !v); if (!bellOpen && unread > 0) markAllRead(); }} style={{ width: 34, height: 34, borderRadius: "50%", background: "transparent", border: "0.5px solid var(--border2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unread > 0 && (
                <span style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#EF4444", color: "#fff", fontSize: "0.55rem", fontWeight: 700, fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--bg)" }}>
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>

            {bellOpen && (
              <div style={{ position: "absolute", right: 0, top: 42, width: 300, background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: 10, overflow: "hidden", zIndex: 100, boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}>
                <div style={{ padding: "0.75rem 1rem", borderBottom: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif" }}>Notifications</span>
                  {unread > 0 && <button onClick={markAllRead} style={{ background: "none", border: "none", fontSize: "0.72rem", color: "#D97706", cursor: "pointer", fontFamily: "sans-serif" }}>Mark all read</button>}
                </div>
                <div style={{ maxHeight: 320, overflowY: "auto" }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text3)", fontSize: "0.8rem", fontFamily: "sans-serif" }}>No notifications yet</div>
                  ) : notifications.map(n => (
                    <div key={n.id} onClick={() => handleNotifClick(n)} style={{ padding: "0.75rem 1rem", cursor: n.room_id ? "pointer" : "default", background: n.read ? "transparent" : "rgba(217,119,6,0.05)", borderBottom: "0.5px solid var(--border)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: n.read ? "var(--border2)" : "#D97706", flexShrink: 0, marginTop: 5 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.78rem", color: "var(--text)", fontFamily: "sans-serif", lineHeight: 1.5, marginBottom: 2 }}>{n.message}</div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{timeAgo(n.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {showBack && (
            <button onClick={() => router.back()} style={{ background: "none", border: "0.5px solid var(--border2)", borderRadius: 5, padding: "6px 12px", fontSize: "0.8rem", color: "var(--text2)", cursor: "pointer", fontFamily: "sans-serif" }}>← Back</button>
          )}

          {/* Auth state */}
          {!userId ? (
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => router.push("/ussd")} style={{ background: "none", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "6px 12px", fontSize: "0.8rem", color: "var(--text2)", cursor: "pointer", fontFamily: "sans-serif" }}>*447#</button>
              <button onClick={() => router.push("/analytics")} style={{ background: "none", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "6px 12px", fontSize: "0.8rem", color: "var(--text2)", cursor: "pointer", fontFamily: "sans-serif" }}>Metrics</button>
              <button onClick={() => router.push("/signin")} style={{ background: "none", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "6px 12px", fontSize: "0.8rem", color: "var(--text2)", cursor: "pointer", fontFamily: "sans-serif" }}>Sign in</button>
              <button onClick={() => router.push("/register")} style={{ background: "#D97706", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" }}>Get started</button>
            </div>
          ) : (
            <div ref={menuRef} style={{ position: "relative" }}>
              <button onClick={() => setUserMenuOpen(v => !v)} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", border: "0.5px solid var(--border2)", borderRadius: 20, padding: "5px 12px 5px 5px", cursor: "pointer" }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#D97706", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, color: "#fff", fontFamily: "sans-serif" }}>ME</div>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </button>

              {userMenuOpen && (
                <div style={{ position: "absolute", right: 0, top: 42, width: 190, background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: 10, zIndex: 100, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", overflow: "hidden" }}>
                  {userType === "host" && (
                    <button onClick={() => { router.push("/dashboard"); setUserMenuOpen(false); }} style={menuBtn}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                      Dashboard
                    </button>
                  )}
                  <button onClick={() => { router.push(`/profile/${userId}`); setUserMenuOpen(false); }} style={menuBtn}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    My profile
                  </button>
                  <button onClick={() => { router.push("/rooms/create"); setUserMenuOpen(false); }} style={menuBtn}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Start a room
                  </button>
                  <button onClick={() => { router.push("/ussd"); setUserMenuOpen(false); }} style={menuBtn}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                    Feature phone
                  </button>
                  <button onClick={() => { router.push("/analytics"); setUserMenuOpen(false); }} style={menuBtn}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    Impact metrics
                  </button>
                  <div style={{ borderTop: "0.5px solid var(--border)", margin: "4px 0" }} />
                  <button onClick={handleSignOut} style={{ ...menuBtn, color: "#EF4444" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Sign out
                  </button>
                  <div style={{ borderTop: "0.5px solid var(--border)", margin: "4px 0" }} />
                  <button onClick={() => { setUserMenuOpen(false); setDeleteOpen(true); }} style={{ ...menuBtn, fontSize: "0.76rem", color: "var(--text3)" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    Delete account
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* ── DELETE ACCOUNT MODAL ── */}
      {deleteOpen && (
        <div onClick={e => { if ((e.target as HTMLElement).id === "del-bg") { setDeleteOpen(false); setDeleteConfirm(""); setDeleteError(""); } }} id="del-bg"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "var(--bg)", borderRadius: 14, border: "0.5px solid var(--border)", width: "100%", maxWidth: 380, padding: "1.5rem" }}>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(239,68,68,0.1)", border: "0.5px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </div>
              <div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif" }}>Delete account</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif" }}>Permanent — cannot be undone</div>
              </div>
            </div>

            <div style={{ background: "rgba(239,68,68,0.06)", border: "0.5px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1.25rem" }}>
              <p style={{ fontSize: "0.8rem", color: "var(--text2)", fontFamily: "sans-serif", lineHeight: 1.65, margin: "0 0 0.4rem" }}>This will permanently delete:</p>
              <ul style={{ fontSize: "0.78rem", color: "var(--text2)", fontFamily: "sans-serif", lineHeight: 1.8, margin: 0, paddingLeft: "1.1rem" }}>
                <li>Your profile and personal data</li>
                <li>Your messages and chat history</li>
                <li>Your follows and notifications</li>
                <li>Your wallet and transaction history</li>
              </ul>
            </div>

            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", fontFamily: "sans-serif", marginBottom: "0.4rem" }}>
              Type <strong style={{ color: "#EF4444" }}>delete</strong> to confirm
            </label>
            <input
              value={deleteConfirm}
              onChange={e => { setDeleteConfirm(e.target.value); setDeleteError(""); }}
              placeholder="delete"
              style={{ width: "100%", background: "var(--bg2)", border: `1px solid ${deleteError ? "rgba(239,68,68,0.5)" : "var(--border2)"}`, borderRadius: 8, padding: "10px 12px", fontSize: "0.9rem", color: "var(--text)", fontFamily: "sans-serif", outline: "none", boxSizing: "border-box" as const, marginBottom: "0.5rem" }}
            />
            {deleteError && <p style={{ fontSize: "0.75rem", color: "#EF4444", fontFamily: "sans-serif", marginBottom: "0.75rem" }}>{deleteError}</p>}

            <div style={{ display: "flex", gap: 8, marginTop: "0.75rem" }}>
              <button onClick={() => { setDeleteOpen(false); setDeleteConfirm(""); setDeleteError(""); }} style={{ flex: 1, background: "var(--bg2)", border: "0.5px solid var(--border2)", borderRadius: 8, padding: "10px", fontSize: "0.88rem", cursor: "pointer", fontFamily: "sans-serif", color: "var(--text2)" }}>
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm.toLowerCase() !== "delete"}
                style={{ flex: 1, background: deleteConfirm.toLowerCase() === "delete" ? "#EF4444" : "var(--bg2)", color: deleteConfirm.toLowerCase() === "delete" ? "#fff" : "var(--text3)", border: "none", borderRadius: 8, padding: "10px", fontSize: "0.88rem", fontWeight: 700, cursor: deleteConfirm.toLowerCase() === "delete" && !deleting ? "pointer" : "default", fontFamily: "sans-serif", transition: "background 0.2s" }}>
                {deleting ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
