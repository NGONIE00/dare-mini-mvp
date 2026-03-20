"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "./ThemeToggle";

type Notification = {
  id: string;
  type: string;
  message: string;
  room_id: string | null;
  read: boolean;
  created_at: string;
};

export function Nav({ showBack = false }: { showBack?: boolean }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [bellOpen,      setBellOpen]      = useState(false);
  const [userId,        setUserId]        = useState<string | null>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) setNotifications(data);

      /* real-time subscription */
      const channel = supabase
        .channel("notifications")
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "notifications",
          filter: `user_id=eq.${user.id}`,
        }, payload => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };
    load();
  }, []);

  /* close bell dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
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
    const diff = (Date.now() - new Date(d).getTime()) / 1000;
    if (diff < 60)   return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
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
          <button onClick={() => { setBellOpen(v => !v); if (!bellOpen && unread > 0) markAllRead(); }} style={{
            width: 34, height: 34, borderRadius: "50%", background: "transparent",
            border: `0.5px solid var(--border2)`, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", transition: "background 0.2s",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unread > 0 && (
              <span style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#EF4444", color: "#fff", fontSize: "0.55rem", fontWeight: 700, fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--bg)" }}>
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {bellOpen && (
            <div style={{ position: "absolute", right: 0, top: 42, width: 300, background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: 10, overflow: "hidden", zIndex: 100, boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}>
              <div style={{ padding: "0.75rem 1rem", borderBottom: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif" }}>Notifications</span>
                {unread > 0 && (
                  <button onClick={markAllRead} style={{ background: "none", border: "none", fontSize: "0.72rem", color: "#D97706", cursor: "pointer", fontFamily: "sans-serif" }}>Mark all read</button>
                )}
              </div>
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text3)", fontSize: "0.8rem", fontFamily: "sans-serif" }}>No notifications yet</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} onClick={() => handleNotifClick(n)} style={{
                      padding: "0.75rem 1rem", cursor: n.room_id ? "pointer" : "default",
                      background: n.read ? "transparent" : "rgba(217,119,6,0.05)",
                      borderBottom: "0.5px solid var(--border)", display: "flex", gap: 10, alignItems: "flex-start",
                      transition: "background 0.15s",
                    }}
                      onMouseEnter={e => { if (n.room_id) (e.currentTarget as HTMLDivElement).style.background = "var(--bg2)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = n.read ? "transparent" : "rgba(217,119,6,0.05)"; }}
                    >
                      {/* dot */}
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: n.read ? "var(--border2)" : "#D97706", flexShrink: 0, marginTop: 5 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.78rem", color: "var(--text)", fontFamily: "sans-serif", lineHeight: 1.5, marginBottom: 2 }}>{n.message}</div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{timeAgo(n.created_at)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {showBack && (
          <button onClick={() => router.back()} style={{ background: "none", border: "0.5px solid var(--border2)", borderRadius: 5, padding: "6px 12px", fontSize: "0.8rem", color: "var(--text2)", cursor: "pointer", fontFamily: "sans-serif" }}>← Back</button>
        )}

        {!userId && (
          <button onClick={() => router.push("/register")} style={{ background: "#D97706", color: "#fff", border: "none", borderRadius: 5, padding: "6px 14px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" }}>
            Get started
          </button>
        )}
      </div>
    </nav>
  );
}
