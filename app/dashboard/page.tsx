"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Nav } from "@/components/Nav";

/* ── types ── */
type Wallet = { balance: number; currency: string };
type Transaction = {
  id: string;
  amount: number;
  transaction_type: string;
  status: string;
  created_at: string;
  from_user_id: string;
  to_user_id: string;
  room_id: string | null;
  rooms?: { title: string } | null;
};
type Room = {
  id: string;
  title: string;
  description?: string;
  category: string;
  scheduled_at: string;
  status: string;
  participant_count: number;
  is_featured: boolean;
  is_ticketed: boolean;
  ticket_price: number;
};
type Profile = {
  display_name: string;
  avatar_url: string | null;
  follower_count: number;
  following_count: number;
  user_type: string;
};

/* ── helpers ── */
const INITIALS = (name: string) =>
  name.trim().split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const fmtTime = (d: string) => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export default function Dashboard() {
  const router = useRouter();

  const [profile,       setProfile]       = useState<Profile | null>(null);
  const [wallet,        setWallet]        = useState<Wallet | null>(null);
  const [transactions,  setTransactions]  = useState<Transaction[]>([]);
  const [rooms,         setRooms]         = useState<Room[]>([]);
  const [userId,        setUserId]        = useState<string | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState<"overview" | "sessions" | "tips" | "followers">("overview");
  const [deletingRoom,  setDeletingRoom]  = useState<string | null>(null);
  const [withdrawOpen,  setWithdrawOpen]  = useState(false);
  /* room management */
  const [editRoom,      setEditRoom]      = useState<Room | null>(null);
  const [deleteRoom,    setDeleteRoom]    = useState<Room | null>(null);
  const [editTitle,     setEditTitle]     = useState("");
  const [editDesc,      setEditDesc]      = useState("");
  const [editDate,      setEditDate]      = useState("");
  const [editTime,      setEditTime]      = useState("");
  const [editTicketed,  setEditTicketed]  = useState(false);
  const [editPrice,     setEditPrice]     = useState("");
  const [roomSaving,    setRoomSaving]    = useState(false);
  const [roomDeleting,  setRoomDeleting]  = useState(false);
  const [withdrawAmt,   setWithdrawAmt]   = useState("");
  const [withdrawing,   setWithdrawing]   = useState(false);
  const [withdrawDone,  setWithdrawDone]  = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/register"); return; }
      setUserId(user.id);

      const [
        { data: prof },
        { data: wal },
        { data: txns },
        { data: hostedRooms },
      ] = await Promise.all([
        supabase.from("profiles").select("display_name, avatar_url, follower_count, following_count, user_type").eq("id", user.id).single(),
        supabase.from("wallets").select("balance, currency").eq("user_id", user.id).single(),
        supabase.from("transactions")
          .select("*, rooms(title)")
          .or(`to_user_id.eq.${user.id},from_user_id.eq.${user.id}`)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("rooms")
          .select("id, title, description, category, scheduled_at, status, participant_count, is_ticketed, ticket_price")
          .eq("host_id", user.id)
          .order("scheduled_at", { ascending: false })
          .limit(20),
      ]);

      if (prof)        setProfile(prof);
      if (wal)         setWallet(wal);
      if (txns)        setTransactions(txns);
      if (hostedRooms) setRooms(hostedRooms);
      setLoading(false);
    };
    load();
  }, []);

  /* ── derived stats ── */
  /* Tips = money received by this host from others */
  const tips = transactions.filter(t =>
    t.transaction_type === "tip" &&
    t.to_user_id === userId
  );
  /* Ticket sales = ticket payments received by this host */
  const ticketSales = transactions.filter(t =>
    t.transaction_type === "ticket" &&
    t.to_user_id === userId
  );
  /* All earnings = tips + ticket sales */
  const allEarnings = [...tips, ...ticketSales];
  const totalEarned = allEarnings.reduce((s, t) => s + Number(t.amount), 0);

  /* Withdrawals = money this host has withdrawn */
  const withdrawals   = transactions.filter(t =>
    t.transaction_type === "withdrawal" &&
    t.from_user_id === userId
  );
  const totalWithdrawn = withdrawals.reduce((s, t) => s + Number(t.amount), 0);

  /* Wallet balance = totalEarned - totalWithdrawn
     (wallet table is source of truth after trigger runs, but we also
      derive it so the dashboard stays consistent with the transaction list) */
  const derivedBalance = Math.max(totalEarned - totalWithdrawn, 0);
  /* Use the wallet table balance if it matches (post-trigger), else use derived */
  const displayBalance = Math.abs((wallet?.balance ?? 0) - derivedBalance) < 0.01
    ? (wallet?.balance ?? 0)
    : derivedBalance;

  const totalListeners = rooms.reduce((s, r) => s + (r.participant_count ?? 0), 0);

  /* tips per room */
  const tipsByRoom: Record<string, { title: string; total: number; count: number; type: string }> = {};
  allEarnings.forEach(t => {
    const key = t.room_id ?? "unknown";
    if (!tipsByRoom[key]) tipsByRoom[key] = { title: t.rooms?.title ?? "Unknown room", total: 0, count: 0, type: t.transaction_type };
    tipsByRoom[key].total += Number(t.amount);
    tipsByRoom[key].count += 1;
  });
  const tipRooms = Object.values(tipsByRoom).sort((a, b) => b.total - a.total);

  /* follower growth (last 6 months buckets) */
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleDateString("en-GB", { month: "short" }), value: 0 };
  });
  const maxFollowers = Math.max(...months.map(m => m.value), profile?.follower_count ?? 0, 1);

  /* ── delete room from dashboard ── */
  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm("Delete this room? This cannot be undone.")) return;
    setDeletingRoom(roomId);
    await supabase.from("rooms").delete().eq("id", roomId);
    setRooms(prev => prev.filter(r => r.id !== roomId));
    setDeletingRoom(null);
  };

  /* ── withdraw ── */
  const handleWithdraw = async () => {
    if (!userId || !wallet || withdrawing) return;
    const amt = parseFloat(withdrawAmt);
    if (isNaN(amt) || amt <= 0 || amt > wallet.balance) return;
    setWithdrawing(true);
    await supabase.from("transactions").insert({
      from_user_id: userId, to_user_id: userId,
      amount: amt, transaction_type: "withdrawal",
      status: "completed", reference: `wd-${Date.now()}`,
    });
    await supabase.from("wallets").update({ balance: wallet.balance - amt }).eq("user_id", userId);
    setWallet(w => w ? { ...w, balance: w.balance - amt } : w);
    setWithdrawDone(true);
    setWithdrawing(false);
    setTimeout(() => { setWithdrawOpen(false); setWithdrawDone(false); setWithdrawAmt(""); }, 2000);
  };

  /* ── Room edit/delete ── */
  const openEditRoom = (r: Room) => {
    setEditRoom(r);
    setEditTitle(r.title);
    setEditDesc(r.description ?? "");
    const d = new Date(r.scheduled_at);
    setEditDate(d.toISOString().split("T")[0]);
    setEditTime(d.toTimeString().slice(0, 5));
    setEditTicketed(r.is_ticketed);
    setEditPrice(r.ticket_price?.toString() ?? "");
  };

  const saveRoom = async () => {
    if (!editRoom || roomSaving) return;
    setRoomSaving(true);
    await supabase.from("rooms").update({
      title:        editTitle.trim().replace(/[<>'"]/g, ""),
      description:  editDesc.trim().replace(/[<>'"]/g, ""),
      scheduled_at: new Date(`${editDate}T${editTime}`).toISOString(),
      is_ticketed:  editTicketed,
      ticket_price: editTicketed ? parseFloat(editPrice) || 0 : 0,
    }).eq("id", editRoom.id);
    setRooms(prev => prev.map(r => r.id === editRoom.id ? { ...r, title: editTitle, description: editDesc, scheduled_at: new Date(`${editDate}T${editTime}`).toISOString(), is_ticketed: editTicketed, ticket_price: editTicketed ? parseFloat(editPrice) || 0 : 0 } : r));
    setRoomSaving(false);
    setEditRoom(null);
  };

  const confirmDeleteRoom = async () => {
    if (!deleteRoom || roomDeleting) return;
    setRoomDeleting(true);
    await supabase.from("room_participants").delete().eq("room_id", deleteRoom.id);
    await supabase.from("messages").delete().eq("room_id", deleteRoom.id);
    await supabase.from("rooms").delete().eq("id", deleteRoom.id);
    setRooms(prev => prev.filter(r => r.id !== deleteRoom.id));
    setRoomDeleting(false);
    setDeleteRoom(null);
  };

  /* ── style tokens ── */
  const card: React.CSSProperties = { background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "1.25rem" };
  const metricCard: React.CSSProperties = { background: "var(--bg2)", borderRadius: 8, padding: "1rem" };
  const secLabel: React.CSSProperties = { fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", fontFamily: "sans-serif", marginBottom: "0.75rem", display: "block" };
  const btnP: React.CSSProperties = { background: "#D97706", color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif", transition: "background 0.2s" };
  const btnGhost: React.CSSProperties = { background: "transparent", color: "var(--text2)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "8px 18px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "sans-serif" };
  const tab = (t: typeof activeTab): React.CSSProperties => ({
    padding: "0.55rem 1.1rem", background: "none", border: "none",
    borderBottom: `2px solid ${activeTab === t ? "#D97706" : "transparent"}`,
    color: activeTab === t ? "#D97706" : "var(--text3)",
    fontSize: "0.82rem", fontWeight: activeTab === t ? 600 : 400,
    cursor: "pointer", fontFamily: "sans-serif",
    transition: "color 0.2s, border-color 0.2s", marginBottom: -1,
  });

  if (loading) return (
    <>
      <Nav />
      <div style={{ background: "var(--bg)", minHeight: "calc(100vh - 60px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text3)", fontFamily: "sans-serif", fontSize: "0.85rem" }}>Loading dashboard...</p>
      </div>
    </>
  );

  return (
    <>
      <Nav />
      <div style={{ background: "var(--bg)", minHeight: "calc(100vh - 60px)", transition: "background 0.3s" }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "2rem 1.5rem 5rem" }}>

          {/* ── HEADER ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#D97706", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", fontWeight: 700, color: "#fff", fontFamily: "sans-serif", overflow: "hidden" }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : INITIALS(profile?.display_name ?? "?")}
              </div>
              <div>
                <h1 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text)", margin: 0, fontFamily: "sans-serif" }}>
                  {profile?.display_name ?? "Creator"}
                </h1>
                <span style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif", textTransform: "capitalize" }}>{profile?.user_type}</span>
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => router.push("/rooms/create")} style={btnP}>+ Start a room</button>
              <button onClick={() => setWithdrawOpen(true)} style={btnGhost}>Withdraw</button>
              <button onClick={() => router.push(`/profile/${userId}`)} style={btnGhost}>Profile</button>
            </div>
          </div>

          {/* ── METRIC CARDS ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: "2rem" }}>
            {[
              { label: "Wallet balance",  value: `$${fmt(displayBalance)}`,  sub: wallet?.currency ?? "USD", accent: true },
              { label: "Total earned",    value: `$${fmt(totalEarned)}`,    sub: `${tips.length} tip${tips.length !== 1 ? "s" : ""} · ${ticketSales.length} ticket${ticketSales.length !== 1 ? "s" : ""}` },
              { label: "Total withdrawn", value: `$${fmt(totalWithdrawn)}`, sub: "paid out" },
              { label: "Sessions hosted", value: rooms.length.toString(),        sub: "rooms" },
              { label: "Total listeners", value: totalListeners.toString(),      sub: "across all rooms" },
              { label: "Followers",       value: (profile?.follower_count ?? 0).toString(), sub: "following you" },
            ].map(m => (
              <div key={m.label} style={{ ...metricCard, border: m.accent ? "0.5px solid rgba(217,119,6,0.3)" : "none" }}>
                <div style={{ fontSize: "0.65rem", color: "var(--text3)", fontFamily: "sans-serif", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{m.label}</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: m.accent ? "#D97706" : "var(--text)", fontFamily: "sans-serif", lineHeight: 1.1 }}>{m.value}</div>
                <div style={{ fontSize: "0.68rem", color: "var(--text3)", fontFamily: "sans-serif", marginTop: 2 }}>{m.sub}</div>
              </div>
            ))}
          </div>

          {/* ── TABS ── */}
          <div style={{ borderBottom: "1px solid var(--divider)", marginBottom: "1.5rem", display: "flex" }}>
            {(["overview", "sessions", "tips", "followers"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={tab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>

              {/* Recent tips */}
              <div style={card}>
                <span style={secLabel}>Recent tips</span>
                {allEarnings.length === 0 ? (
                  <p style={{ fontSize: "0.82rem", color: "var(--text3)", fontFamily: "sans-serif" }}>No earnings yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {allEarnings.slice(0, 5).map(t => (
                      <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: "0.82rem", color: "var(--text)", fontFamily: "sans-serif" }}>{t.rooms?.title ?? "Room"}</div>
                          <div style={{ fontSize: "0.68rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{fmtDate(t.created_at)} · {t.transaction_type === "ticket" ? "🎟️ Ticket" : "💛 Tip"}</div>
                        </div>
                        <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#059669", fontFamily: "sans-serif" }}>+${fmt(Number(t.amount))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent sessions */}
              <div style={card}>
                <span style={secLabel}>Recent sessions</span>
                {rooms.length === 0 ? (
                  <p style={{ fontSize: "0.82rem", color: "var(--text3)", fontFamily: "sans-serif" }}>No sessions yet. <button onClick={() => router.push("/rooms/create")} style={{ background: "none", border: "none", color: "#D97706", cursor: "pointer", fontFamily: "sans-serif", fontSize: "0.82rem" }}>Start one →</button></p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {rooms.slice(0, 5).map(r => (
                      <div key={r.id} onClick={() => router.push(`/rooms/${r.id}`)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: "0.82rem", color: "var(--text)", fontFamily: "sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                          <div style={{ fontSize: "0.68rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{fmtDate(r.scheduled_at)}</div>
                        </div>
                        <span style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif", marginLeft: 8, flexShrink: 0 }}>{r.participant_count} listeners</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SESSIONS TAB ── */}
          {activeTab === "sessions" && (
            <div style={card}>
              <span style={secLabel}>All sessions</span>
              {rooms.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem 0" }}>
                  <p style={{ fontSize: "0.85rem", color: "var(--text3)", fontFamily: "sans-serif", marginBottom: "1rem" }}>No sessions hosted yet.</p>
                  <button onClick={() => router.push("/rooms/create")} style={btnP}>+ Start your first room</button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {rooms.map(r => {
                    const roomTips = tips.filter(t => t.room_id === r.id);
                    const roomTipTotal = roomTips.reduce((s, t) => s + t.amount, 0);
                    return (
                      <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", padding: "0.9rem 1rem", background: "var(--bg2)", borderRadius: 8, flexWrap: "wrap" as const }}>
                        {/* Title + date — clickable to room */}
                        <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => router.push(`/rooms/${r.id}`)}>
                          <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", fontFamily: "sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif", marginTop: 2 }}>
                            {fmtDate(r.scheduled_at)} · {fmtTime(r.scheduled_at)}
                          </div>
                        </div>
                        {/* Stats */}
                        <div style={{ display: "flex", gap: "1rem", flexShrink: 0, alignItems: "center" }}>
                          <div style={{ textAlign: "center" as const }}>
                            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif" }}>{r.participant_count}</div>
                            <div style={{ fontSize: "0.6rem", color: "var(--text3)", fontFamily: "sans-serif" }}>listeners</div>
                          </div>
                          {roomTipTotal > 0 && (
                            <div style={{ textAlign: "center" as const }}>
                              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#059669", fontFamily: "sans-serif" }}>${fmt(roomTipTotal)}</div>
                              <div style={{ fontSize: "0.6rem", color: "var(--text3)", fontFamily: "sans-serif" }}>tips</div>
                            </div>
                          )}
                          <span style={{
                            background: r.status === "live" ? "rgba(5,150,105,0.12)" : r.status === "ended" ? "var(--bg3)" : "rgba(217,119,6,0.12)",
                            color: r.status === "live" ? "#059669" : r.status === "ended" ? "var(--text3)" : "#D97706",
                            border: `0.5px solid ${r.status === "live" ? "rgba(5,150,105,0.3)" : r.status === "ended" ? "var(--border)" : "rgba(217,119,6,0.3)"}`,
                            borderRadius: 100, padding: "2px 7px", fontSize: "0.62rem",
                            fontWeight: 600, fontFamily: "sans-serif", textTransform: "capitalize",
                          }}>{r.status}</span>
                        </div>
                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          {r.status !== "ended" && (
                            <button
                              onClick={async e => {
                                e.stopPropagation();
                                await supabase.from("rooms").update({ is_featured: !r.is_featured }).eq("id", r.id);
                                setRooms(prev => prev.map(x => x.id === r.id ? { ...x, is_featured: !x.is_featured } : x));
                              }}
                              title={r.is_featured ? "Unpin room" : "Pin to top"}
                              style={{ background: r.is_featured ? "rgba(217,119,6,0.1)" : "var(--bg)", border: `0.5px solid ${r.is_featured ? "#D97706" : "var(--border2)"}`, borderRadius: 7, padding: "5px 10px", fontSize: "0.75rem", cursor: "pointer", fontFamily: "sans-serif", color: r.is_featured ? "#D97706" : "var(--text2)" }}>
                            {r.is_featured ? "📌" : "📍"}
                          </button>
                          <button onClick={e => { e.stopPropagation(); openEditRoom(r); }} style={{ background: "var(--bg)", border: "0.5px solid var(--border2)", borderRadius: 7, padding: "5px 12px", fontSize: "0.75rem", cursor: "pointer", fontFamily: "sans-serif", color: "var(--text2)", fontWeight: 600 }}>
                              ✏️ Edit
                            </button>
                          )}
                          <button onClick={e => { e.stopPropagation(); setDeleteRoom(r); }} style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.2)", borderRadius: 7, padding: "5px 12px", fontSize: "0.75rem", cursor: "pointer", fontFamily: "sans-serif", color: "#EF4444", fontWeight: 600 }}>
                            🗑 Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TIPS TAB ── */}
          {activeTab === "tips" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Tips by room */}
              <div style={card}>
                <span style={secLabel}>Tips by room</span>
                {tipRooms.length === 0 ? (
                  <p style={{ fontSize: "0.82rem", color: "var(--text3)", fontFamily: "sans-serif" }}>No tips received yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {tipRooms.map((tr, i) => {
                      const pct = Math.round((tr.total / totalEarned) * 100);
                      return (
                        <div key={i}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: "0.82rem", color: "var(--text)", fontFamily: "sans-serif" }}>{tr.title}</span>
                            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#059669", fontFamily: "sans-serif" }}>${fmt(tr.total)} <span style={{ color: "var(--text3)", fontWeight: 400 }}>({tr.count} tip{tr.count > 1 ? "s" : ""})</span></span>
                          </div>
                          <div style={{ background: "var(--bg2)", borderRadius: 100, height: 5, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: "#059669", borderRadius: 100, transition: "width 0.4s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* All tip transactions */}
              <div style={card}>
                <span style={secLabel}>All tip transactions</span>
                {allEarnings.length === 0 ? (
                  <p style={{ fontSize: "0.82rem", color: "var(--text3)", fontFamily: "sans-serif" }}>No earnings yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {allEarnings.map(t => (
                      <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 0", borderBottom: "0.5px solid var(--border)" }}>
                        <div>
                          <div style={{ fontSize: "0.8rem", color: "var(--text)", fontFamily: "sans-serif" }}>{t.rooms?.title ?? "Room"}</div>
                          <div style={{ fontSize: "0.68rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{fmtDate(t.created_at)} · {fmtTime(t.created_at)}</div>
                        </div>
                        <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#059669", fontFamily: "sans-serif" }}>+${fmt(t.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── FOLLOWERS TAB ── */}
          {activeTab === "followers" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={card}>
                <span style={secLabel}>Follower overview</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1.5rem" }}>
                  {[
                    { label: "Followers",  value: profile?.follower_count ?? 0,  color: "#D97706" },
                    { label: "Following",  value: profile?.following_count ?? 0, color: "var(--text)" },
                  ].map(s => (
                    <div key={s.label} style={{ ...metricCard, textAlign: "center" as const }}>
                      <div style={{ fontSize: "2rem", fontWeight: 700, color: s.color, fontFamily: "sans-serif" }}>{s.value}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Growth bar chart — last 6 months */}
                <div style={{ marginBottom: "0.5rem" }}>
                  <span style={secLabel}>Follower growth (last 6 months)</span>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
                    {months.map((m, i) => {
                      const isLast = i === months.length - 1;
                      const height = isLast
                        ? Math.max(Math.round(((profile?.follower_count ?? 0) / maxFollowers) * 100), 8)
                        : Math.max(Math.round((m.value / maxFollowers) * 100), 4);
                      return (
                        <div key={m.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ width: "100%", height: `${height}%`, background: isLast ? "#D97706" : "var(--bg3)", borderRadius: "4px 4px 0 0", minHeight: 4, transition: "height 0.4s ease" }} />
                          <span style={{ fontSize: "0.62rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{m.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <p style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif", lineHeight: 1.6, marginTop: "0.75rem" }}>
                  Followers are notified every time you publish a new room. Build your audience by hosting consistently.
                </p>
              </div>

              {/* CTA */}
              <div style={{ ...card, background: "rgba(217,119,6,0.06)", border: "0.5px solid rgba(217,119,6,0.2)", textAlign: "center" as const }}>
                <p style={{ fontSize: "0.88rem", color: "var(--text)", fontFamily: "sans-serif", marginBottom: "1rem", lineHeight: 1.6 }}>
                  Start a room to notify your <strong style={{ color: "#D97706" }}>{profile?.follower_count ?? 0} follower{(profile?.follower_count ?? 0) !== 1 ? "s" : ""}</strong> instantly.
                </p>
                <button onClick={() => router.push("/rooms/create")} style={btnP}>+ Start a room now</button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── WITHDRAW MODAL ── */}
      {withdrawOpen && (
        <div onClick={e => { if ((e.target as HTMLElement).id === "wd-overlay") setWithdrawOpen(false); }} id="wd-overlay"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "var(--bg)", borderRadius: 12, border: "0.5px solid var(--border)", width: "100%", maxWidth: 360, padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif" }}>Withdraw funds</span>
              <button onClick={() => setWithdrawOpen(false)} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text2)" }}>×</button>
            </div>

            {withdrawDone ? (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(5,150,105,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem", border: "0.5px solid rgba(5,150,105,0.3)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p style={{ color: "#059669", fontFamily: "sans-serif", fontWeight: 600, marginBottom: 4 }}>Withdrawal successful</p>
                <p style={{ color: "var(--text3)", fontSize: "0.78rem", fontFamily: "sans-serif" }}>USD ${parseFloat(withdrawAmt || "0").toFixed(2)} will be processed via mobile money.</p>
              </div>
            ) : (
              <>
                <div style={{ background: "var(--bg2)", borderRadius: 8, padding: "0.9rem 1rem", marginBottom: "1.25rem" }}>
                  <div style={{ fontSize: "0.68rem", color: "var(--text3)", fontFamily: "sans-serif", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Available balance</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#D97706", fontFamily: "sans-serif" }}>${fmt(wallet?.balance ?? 0)}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{wallet?.currency ?? "USD"}</div>
                </div>
                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text)", fontFamily: "sans-serif", marginBottom: "0.4rem" }}>Amount to withdraw</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.9rem", color: "var(--text3)", fontFamily: "sans-serif" }}>USD $</span>
                    <input
                      type="number" value={withdrawAmt} min={0.5} max={wallet?.balance ?? 0} step={0.5}
                      onChange={e => setWithdrawAmt(e.target.value)}
                      placeholder="0.00"
                      style={{ flex: 1, background: "var(--bg2)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "9px 11px", fontSize: "0.9rem", color: "var(--text)", fontFamily: "sans-serif", outline: "none" }}
                    />
                  </div>
                </div>
                <p style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif", lineHeight: 1.6, marginBottom: "1.25rem" }}>
                  Funds will be sent via mobile money (EcoCash, Mpesa, MTN MoMo). Processing time: 1–2 business days. This is a prototype — no real transfer will occur.
                </p>
                <button onClick={handleWithdraw} disabled={withdrawing || !withdrawAmt || parseFloat(withdrawAmt) <= 0} style={{ ...btnP, width: "100%", padding: "11px", opacity: !withdrawAmt || parseFloat(withdrawAmt) <= 0 ? 0.5 : 1 }}>
                  {withdrawing ? "Processing..." : `Withdraw $${parseFloat(withdrawAmt || "0").toFixed(2)}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {/* ── EDIT ROOM MODAL ── */}
      {editRoom && (
        <div onClick={e => { if ((e.target as HTMLElement).id === "edit-room-bg") setEditRoom(null); }} id="edit-room-bg"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "var(--bg)", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 520, padding: "1.5rem 1.5rem 2.5rem", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif", margin: 0 }}>Edit room</h2>
              <button onClick={() => setEditRoom(null)} style={{ background: "var(--bg2)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", color: "var(--text2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>×</button>
            </div>

            {/* Title */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", fontFamily: "sans-serif", marginBottom: 5 }}>Room title</label>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} maxLength={80}
                style={{ width: "100%", background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 9, padding: "10px 13px", fontSize: "0.9rem", color: "var(--text)", fontFamily: "sans-serif", outline: "none", boxSizing: "border-box" as const }} />
              <div style={{ fontSize: "0.68rem", color: "var(--text3)", fontFamily: "sans-serif", textAlign: "right", marginTop: 3 }}>{editTitle.length}/80</div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", fontFamily: "sans-serif", marginBottom: 5 }}>Description</label>
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} maxLength={300} rows={3}
                style={{ width: "100%", background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 9, padding: "10px 13px", fontSize: "0.9rem", color: "var(--text)", fontFamily: "sans-serif", outline: "none", resize: "vertical" as const, boxSizing: "border-box" as const }} />
              <div style={{ fontSize: "0.68rem", color: "var(--text3)", fontFamily: "sans-serif", textAlign: "right", marginTop: 3 }}>{editDesc.length}/300</div>
            </div>

            {/* Date + Time */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", fontFamily: "sans-serif", marginBottom: 5 }}>Date</label>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                  style={{ width: "100%", background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 9, padding: "10px 13px", fontSize: "0.9rem", color: "var(--text)", fontFamily: "sans-serif", outline: "none", boxSizing: "border-box" as const }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", fontFamily: "sans-serif", marginBottom: 5 }}>Time</label>
                <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)}
                  style={{ width: "100%", background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 9, padding: "10px 13px", fontSize: "0.9rem", color: "var(--text)", fontFamily: "sans-serif", outline: "none", boxSizing: "border-box" as const }} />
              </div>
            </div>

            {/* Ticket toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "0.5px solid var(--border)", marginBottom: "0.75rem" }}>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", fontFamily: "sans-serif" }}>Ticketed room</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif" }}>Charge listeners to join</div>
              </div>
              <button onClick={() => setEditTicketed(v => !v)} style={{ width: 36, height: 20, borderRadius: 100, border: "none", cursor: "pointer", background: editTicketed ? "#D97706" : "var(--border2)", position: "relative", transition: "background 0.2s" }}>
                <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: editTicketed ? 19 : 3, transition: "left 0.2s", display: "block" }} />
              </button>
            </div>
            {editTicketed && (
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", fontFamily: "sans-serif", marginBottom: 5 }}>Ticket price (USD)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "var(--text3)", fontFamily: "sans-serif" }}>$</span>
                  <input type="number" min="0.50" step="0.50" value={editPrice} onChange={e => setEditPrice(e.target.value)} placeholder="1.00"
                    style={{ flex: 1, background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 9, padding: "10px 13px", fontSize: "0.9rem", color: "var(--text)", fontFamily: "sans-serif", outline: "none" }} />
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setEditRoom(null)} style={{ flex: 1, background: "var(--bg2)", border: "0.5px solid var(--border2)", borderRadius: 10, padding: "12px", fontSize: "0.9rem", cursor: "pointer", fontFamily: "sans-serif", color: "var(--text2)" }}>
                Cancel
              </button>
              <button onClick={saveRoom} disabled={roomSaving || !editTitle.trim()} style={{ flex: 2, background: "#D97706", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: "0.9rem", fontWeight: 700, cursor: roomSaving ? "default" : "pointer", fontFamily: "sans-serif", opacity: roomSaving ? 0.7 : 1 }}>
                {roomSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE ROOM MODAL ── */}
      {deleteRoom && (
        <div onClick={e => { if ((e.target as HTMLElement).id === "del-room-bg") setDeleteRoom(null); }} id="del-room-bg"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "var(--bg)", borderRadius: 16, border: "0.5px solid var(--border)", width: "100%", maxWidth: 380, padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(239,68,68,0.1)", border: "0.5px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
              </div>
              <div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif" }}>Delete room</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif" }}>This cannot be undone</div>
              </div>
            </div>
            <div style={{ background: "var(--bg2)", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1.25rem" }}>
              <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", fontFamily: "sans-serif", margin: "0 0 0.2rem" }}>{deleteRoom.title}</p>
              <p style={{ fontSize: "0.75rem", color: "var(--text3)", fontFamily: "sans-serif", margin: 0 }}>{fmtDate(deleteRoom.scheduled_at)} · {deleteRoom.participant_count} listeners</p>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text2)", fontFamily: "sans-serif", lineHeight: 1.6, marginBottom: "1.25rem" }}>
              All messages and participant data for this room will be permanently removed.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setDeleteRoom(null)} style={{ flex: 1, background: "var(--bg2)", border: "0.5px solid var(--border2)", borderRadius: 10, padding: "11px", fontSize: "0.9rem", cursor: "pointer", fontFamily: "sans-serif", color: "var(--text2)" }}>
                Cancel
              </button>
              <button onClick={confirmDeleteRoom} disabled={roomDeleting} style={{ flex: 1, background: "#EF4444", color: "#fff", border: "none", borderRadius: 10, padding: "11px", fontSize: "0.9rem", fontWeight: 700, cursor: roomDeleting ? "default" : "pointer", fontFamily: "sans-serif", opacity: roomDeleting ? 0.7 : 1 }}>
                {roomDeleting ? "Deleting..." : "Delete room"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
