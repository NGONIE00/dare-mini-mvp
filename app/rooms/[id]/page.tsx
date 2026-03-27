"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* ── types ── */
type Room = {
  id: string; host_id: string; title: string; description: string;
  category: string; language: string; scheduled_at: string;
  duration_minutes: number; status: string;
  is_ticketed: boolean; ticket_price: number; participant_count: number;
  profiles: { id: string; display_name: string; avatar_url: string | null } | null;
};
type Message = {
  id: string; user_id: string; message: string; created_at: string;
  profiles?: { display_name: string; avatar_url: string | null };
};
type Participant = {
  id: string; user_id: string; joined_at: string;
  profiles?: { id: string; display_name: string; avatar_url: string | null };
};
type HandRaise = { id: string; user_id: string; display_name: string; raised_at: string };

/* ── helpers ── */
const INITIALS = (n: string) =>
  n.trim().split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

const AVATAR_COLOR = (id: string) => {
  const c = ["#D97706","#059669","#3B82F6","#7C3AED","#EF4444","#EC4899","#0891B2","#65A30D"];
  let h = 0; for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return c[Math.abs(h) % c.length];
};

const fmtTime = (d: string) => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const PAYMENT_METHODS = [
  { id: "EcoCash",  label: "EcoCash",  desc: "*151#",               color: "#D97706" },
  { id: "Mukuru",   label: "Mukuru",   desc: "Southern Africa",     color: "#059669" },
  { id: "OneMoney", label: "OneMoney", desc: "NetOne Zimbabwe",     color: "#3B82F6" },
  { id: "Telecash", label: "Telecash", desc: "Telecel Zimbabwe",    color: "#7C3AED" },
  { id: "M-Pesa",   label: "M-Pesa",   desc: "East Africa",         color: "#22C55E" },
  { id: "MTN MoMo", label: "MTN MoMo", desc: "West & South Africa", color: "#F59E0B" },
];

/* ── Avatar component ── */
const Av = ({ id, name, url, size = 40, ring = false, speaking = false }:
  { id: string; name: string; url?: string | null; size?: number; ring?: boolean; speaking?: boolean }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
    background: AVATAR_COLOR(id),
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.32, fontWeight: 700, color: "#fff", fontFamily: "sans-serif",
    border: speaking ? "2.5px solid #059669" : ring ? "2px solid #D97706" : "none",
    transition: "border 0.2s",
  }}>
    {url
      ? <img src={url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      : INITIALS(name)}
  </div>
);

export default function RoomPage() {
  const router  = useRouter();
  const params  = useParams();
  const roomId  = params.id as string;

  /* ── state ── */
  const [room,         setRoom]         = useState<Room | null>(null);
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [handQueue,    setHandQueue]    = useState<HandRaise[]>([]);
  const [currentUser,  setCurrentUser]  = useState<string | null>(null);
  const [currentName,  setCurrentName]  = useState("You");
  const [currentAvUrl, setCurrentAvUrl] = useState<string | null>(null);
  const [isHost,       setIsHost]       = useState(false);
  const [myHandRaised, setMyHandRaised] = useState(false);
  const [following,    setFollowing]    = useState<Set<string>>(new Set());
  const [mutedUsers,   setMutedUsers]   = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<Participant | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [ended,        setEnded]        = useState(false);
  const [ending,       setEnding]       = useState(false);
  const [chatInput,    setChatInput]    = useState("");
  const [sending,      setSending]      = useState(false);
  /* tip */
  const [tipOpen,      setTipOpen]      = useState(false);
  const [tipAmount,    setTipAmount]    = useState("");
  const [tipPayment,   setTipPayment]   = useState("");
  const [tipStep,      setTipStep]      = useState<"amount"|"method">("amount");
  const [tipSent,      setTipSent]      = useState(false);
  const [tipLoading,   setTipLoading]   = useState(false);
  /* mobile panel */
  const [mobilePanel,  setMobilePanel]  = useState<null|"chat"|"info"|"people">(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  /* ── load ── */
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user.id);
        const { data: prof } = await supabase.from("profiles").select("display_name,avatar_url").eq("id", user.id).single();
        if (prof) { setCurrentName(prof.display_name); setCurrentAvUrl(prof.avatar_url); }
      }
      const { data: roomData } = await supabase.from("rooms").select("*, profiles(id,display_name,avatar_url)").eq("id", roomId).single();
      if (!roomData) { router.push("/rooms"); return; }
      setRoom(roomData);
      setIsHost(user?.id === roomData.host_id);
      if (roomData.status === "ended") setEnded(true);
      const [{ data: msgs }, { data: parts }] = await Promise.all([
        supabase.from("messages").select("*, profiles(display_name,avatar_url)").eq("room_id", roomId).order("created_at", { ascending: true }).limit(100),
        supabase.from("room_participants").select("*, profiles(id,display_name,avatar_url)").eq("room_id", roomId),
      ]);
      if (msgs)  setMessages(msgs);
      if (parts) setParticipants(parts);
      if (user) {
        const already = parts?.find((p: Participant) => p.user_id === user.id);
        if (!already) {
          await supabase.from("room_participants").insert({ room_id: roomId, user_id: user.id, payment_status: "free" });
          await supabase.from("rooms").update({ participant_count: (roomData.participant_count ?? 0) + 1 }).eq("id", roomId);
        }
        const { data: fol } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
        if (fol) setFollowing(new Set(fol.map((f: { following_id: string }) => f.following_id)));
      }
      setLoading(false);
    };
    init();
  }, [roomId]);

  /* ── realtime ── */
  useEffect(() => {
    const msgCh = supabase.channel(`msgs-${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        async (payload: { new: Message }) => {
          const { data: prof } = await supabase.from("profiles").select("display_name,avatar_url").eq("id", payload.new.user_id).single();
          setMessages(prev => [...prev, { ...payload.new, profiles: prof ?? undefined }]);
        })
      .subscribe();
    const handCh = supabase.channel(`hands-${roomId}`)
      .on("broadcast", { event: "hand_raise" }, ({ payload }: { payload: HandRaise }) => {
        setHandQueue(prev => prev.find(h => h.user_id === payload.user_id) ? prev : [...prev, payload]);
      })
      .on("broadcast", { event: "hand_lower" }, ({ payload }: { payload: { user_id: string } }) => {
        setHandQueue(prev => prev.filter(h => h.user_id !== payload.user_id));
      })
      .subscribe();
    return () => { supabase.removeChannel(msgCh); supabase.removeChannel(handCh); };
  }, [roomId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { document.body.style.overflow = (tipOpen || mobilePanel !== null) ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [tipOpen, mobilePanel]);

  /* ── actions ── */
  const sendMessage = async () => {
    if (!chatInput.trim() || !currentUser || sending) return;
    setSending(true);
    const text = chatInput.trim();
    setChatInput("");
    await supabase.from("messages").insert({ room_id: roomId, user_id: currentUser, message: text });
    setSending(false);
    inputRef.current?.focus();
  };

  const toggleHand = async () => {
    if (!currentUser) return;
    const ch = supabase.channel(`hands-${roomId}`);
    if (myHandRaised) {
      await ch.send({ type: "broadcast", event: "hand_lower", payload: { user_id: currentUser } });
      setHandQueue(prev => prev.filter(h => h.user_id !== currentUser));
    } else {
      await ch.send({ type: "broadcast", event: "hand_raise", payload: { user_id: currentUser, display_name: currentName, raised_at: new Date().toISOString() } });
    }
    setMyHandRaised(v => !v);
  };

  const toggleFollow = async (uid: string) => {
    if (!currentUser || uid === currentUser) return;
    if (following.has(uid)) {
      await supabase.from("follows").delete().eq("follower_id", currentUser).eq("following_id", uid);
      setFollowing(prev => { const n = new Set(prev); n.delete(uid); return n; });
    } else {
      await supabase.from("follows").insert({ follower_id: currentUser, following_id: uid });
      setFollowing(prev => new Set([...prev, uid]));
    }
  };

  const endRoom = async () => {
    if (!isHost || ending) return;
    setEnding(true);
    await supabase.from("rooms").update({ status: "ended" }).eq("id", roomId);
    setEnded(true);
    setEnding(false);
  };

  const leaveRoom = async () => {
    if (currentUser) await supabase.from("room_participants").delete().eq("room_id", roomId).eq("user_id", currentUser);
    router.push("/rooms");
  };

  const sendTip = async () => {
    if (!currentUser || !room || tipLoading || !tipAmount || !tipPayment) return;
    setTipLoading(true);
    await supabase.from("transactions").insert({ from_user_id: currentUser, to_user_id: room.host_id, room_id: roomId, amount: parseFloat(tipAmount), transaction_type: "tip", status: "completed", reference: `tip-${Date.now()}` });
    setTipSent(true);
    setTipLoading(false);
    setTimeout(() => { setTipOpen(false); setTipSent(false); setTipAmount(""); setTipPayment(""); setTipStep("amount"); }, 3000);
  };

  const closeTip = () => { setTipOpen(false); setTipStep("amount"); setTipPayment(""); };

  if (loading) return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "var(--text3)", fontFamily: "sans-serif", fontSize: "0.85rem" }}>Loading room...</p>
    </div>
  );
  if (!room) return null;

  const statusColor = ended ? "#737373" : room.status === "live" ? "#059669" : "#D97706";
  const statusLabel = ended ? "Ended" : room.status === "live" ? "Live" : "Scheduled";

  /* ── PARTICIPANT GRID (Clubhouse style) ── */
  const ParticipantGrid = () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))", gap: "1rem 0.5rem", padding: "1rem" }}>
      {participants.map(p => {
        const prof = p.profiles;
        if (!prof) return null;
        const isRoomHost = p.user_id === room.host_id;
        const isMe = p.user_id === currentUser;
        const isSelected = selectedUser?.user_id === p.user_id;
        const isMuted = mutedUsers.has(p.user_id);
        const hasHand = handQueue.find(h => h.user_id === p.user_id);
        return (
          <div key={p.id} onClick={() => setSelectedUser(isSelected ? null : p)}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", position: "relative" }}>
            <div style={{ position: "relative" }}>
              <Av id={prof.id} name={prof.display_name} url={prof.avatar_url} size={56}
                ring={isSelected} speaking={isRoomHost && room.status === "live"} />
              {/* Host crown badge */}
              {isRoomHost && (
                <div style={{ position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)", background: "#D97706", borderRadius: 100, padding: "1px 5px", display: "flex", alignItems: "center", gap: 2 }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="#fff"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  <span style={{ fontSize: "0.52rem", color: "#fff", fontFamily: "sans-serif", fontWeight: 700 }}>HOST</span>
                </div>
              )}
              {/* Muted badge */}
              {isMuted && (
                <div style={{ position: "absolute", bottom: 0, right: 0, width: 18, height: 18, borderRadius: "50%", background: "#EF4444", border: "2px solid var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                </div>
              )}
              {/* Hand raised badge */}
              {hasHand && (
                <div style={{ position: "absolute", bottom: 0, left: 0, width: 18, height: 18, borderRadius: "50%", background: "#D97706", border: "2px solid var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>
                  ✋
                </div>
              )}
              {/* Me indicator */}
              {isMe && (
                <div style={{ position: "absolute", bottom: 0, right: 0, width: 18, height: 18, borderRadius: "50%", background: "#3B82F6", border: "2px solid var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                </div>
              )}
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text)", fontFamily: "sans-serif", maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {isMe ? "You" : prof.display_name.split(" ")[0]}
              </div>
              {!isRoomHost && !isMe && (
                <button onClick={e => { e.stopPropagation(); toggleFollow(p.user_id); }} style={{
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                  fontSize: "0.62rem", color: following.has(p.user_id) ? "var(--text3)" : "#D97706",
                  fontFamily: "sans-serif", fontWeight: 600,
                }}>
                  {following.has(p.user_id) ? "Following" : "+ Follow"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  /* ── CHAT PANEL ── */
  const ChatPanel = ({ height = "100%" }: { height?: string }) => (
    <div style={{ display: "flex", flexDirection: "column", height, background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "0.75rem 1rem", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", gap: 6 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text3)", fontFamily: "sans-serif" }}>Live chat</span>
        <span style={{ marginLeft: "auto", fontSize: "0.68rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{messages.length}</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text3)", fontSize: "0.78rem", fontFamily: "sans-serif", marginTop: "2rem" }}>No messages yet</div>
        )}
        {messages.map(msg => {
          const isMe = msg.user_id === currentUser;
          return (
            <div key={msg.id} style={{ display: "flex", gap: 7, alignItems: "flex-start", flexDirection: isMe ? "row-reverse" : "row" }}>
              <Av id={msg.user_id} name={msg.profiles?.display_name ?? "?"} url={msg.profiles?.avatar_url} size={26} />
              <div style={{ maxWidth: "76%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", gap: 2 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexDirection: isMe ? "row-reverse" : "row" }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, color: isMe ? "#D97706" : "var(--text2)", fontFamily: "sans-serif" }}>
                    {isMe ? "You" : (msg.profiles?.display_name ?? "User")}
                  </span>
                  <span style={{ fontSize: "0.6rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{fmtTime(msg.created_at)}</span>
                </div>
                <div style={{
                  background: isMe ? "rgba(217,119,6,0.12)" : "var(--bg2)",
                  border: `0.5px solid ${isMe ? "rgba(217,119,6,0.25)" : "var(--border)"}`,
                  borderRadius: isMe ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  padding: "7px 11px", fontSize: "0.84rem", color: "var(--text)",
                  fontFamily: "sans-serif", lineHeight: 1.5, wordBreak: "break-word" as const,
                }}>
                  {msg.message}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>
      {!ended && currentUser ? (
        <div style={{ padding: "0.65rem 0.75rem", borderTop: "0.5px solid var(--border)", display: "flex", gap: 7 }}>
          <input ref={inputRef} value={chatInput} onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Say something..." maxLength={400}
            style={{ flex: 1, background: "var(--bg2)", border: "0.5px solid var(--border2)", borderRadius: 20, padding: "8px 14px", fontSize: "0.84rem", color: "var(--text)", fontFamily: "sans-serif", outline: "none" }}
          />
          <button onClick={sendMessage} disabled={!chatInput.trim() || sending} style={{
            width: 34, height: 34, borderRadius: "50%", border: "none",
            background: chatInput.trim() ? "#D97706" : "var(--bg2)",
            cursor: chatInput.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={chatInput.trim() ? "#fff" : "var(--text3)"} strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      ) : !currentUser ? (
        <div style={{ padding: "0.65rem 0.75rem", borderTop: "0.5px solid var(--border)" }}>
          <button onClick={() => router.push("/register")} style={{ width: "100%", background: "#D97706", color: "#fff", border: "none", borderRadius: 8, padding: "9px", fontSize: "0.84rem", fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" }}>
            Sign in to chat
          </button>
        </div>
      ) : null}
    </div>
  );

  /* ── INFO PANEL ── */
  const InfoPanel = () => (
    <div style={{ background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "0.75rem 1rem", borderBottom: "0.5px solid var(--border)" }}>
        <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text3)", fontFamily: "sans-serif" }}>Room info</span>
      </div>
      <div style={{ padding: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
        {[
          { l: "Category",  v: room.category,      cap: true },
          { l: "Language",  v: room.language,      cap: true },
          { l: "Date",      v: fmtDate(room.scheduled_at) },
          { l: "Time",      v: fmtTime(room.scheduled_at) },
          { l: "Duration",  v: room.duration_minutes ? `${room.duration_minutes} min` : "Open" },
          { l: "Ticket",    v: room.is_ticketed ? `$${room.ticket_price.toFixed(2)}` : "Free" },
        ].map(item => (
          <div key={item.l}>
            <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text3)", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: 2 }}>{item.l}</div>
            <div style={{ fontSize: "0.82rem", color: "var(--text)", fontFamily: "sans-serif", textTransform: item.cap ? "capitalize" : "none" }}>{item.v}</div>
          </div>
        ))}
      </div>
      {room.description && (
        <div style={{ padding: "0 1rem 1rem" }}>
          <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text3)", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: 4 }}>About</div>
          <p style={{ fontSize: "0.82rem", color: "var(--text2)", fontFamily: "sans-serif", lineHeight: 1.65, margin: 0 }}>{room.description}</p>
        </div>
      )}
    </div>
  );

  /* ── SELECTED USER CARD ── */
  const UserCard = () => {
    if (!selectedUser?.profiles) return null;
    const prof = selectedUser.profiles;
    const isRoomHost = selectedUser.user_id === room.host_id;
    const isMe = selectedUser.user_id === currentUser;
    return (
      <div style={{ background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "0.75rem" }}>
          <Av id={prof.id} name={prof.display_name} url={prof.avatar_url} size={44} />
          <div>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif" }}>{prof.display_name}</div>
            {isRoomHost && <div style={{ fontSize: "0.65rem", color: "#D97706", fontFamily: "sans-serif", fontWeight: 600 }}>Host</div>}
          </div>
          <button onClick={() => setSelectedUser(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: "1.1rem" }}>×</button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
          <button onClick={() => router.push(`/profile/${prof.id}`)} style={{ flex: 1, background: "var(--bg2)", border: "0.5px solid var(--border2)", borderRadius: 7, padding: "7px", fontSize: "0.78rem", cursor: "pointer", fontFamily: "sans-serif", color: "var(--text2)" }}>
            View profile
          </button>
          {!isMe && !isRoomHost && (
            <button onClick={() => toggleFollow(selectedUser.user_id)} style={{ flex: 1, background: following.has(selectedUser.user_id) ? "transparent" : "#D97706", border: `0.5px solid ${following.has(selectedUser.user_id) ? "var(--border2)" : "#D97706"}`, borderRadius: 7, padding: "7px", fontSize: "0.78rem", cursor: "pointer", fontFamily: "sans-serif", color: following.has(selectedUser.user_id) ? "var(--text3)" : "#fff", fontWeight: 600 }}>
              {following.has(selectedUser.user_id) ? "Following ✓" : "+ Follow"}
            </button>
          )}
          {isHost && !isMe && (
            <button onClick={() => { setMutedUsers(prev => { const n = new Set(prev); n.has(selectedUser.user_id) ? n.delete(selectedUser.user_id) : n.add(selectedUser.user_id); return n; }); }} style={{ flex: 1, background: mutedUsers.has(selectedUser.user_id) ? "rgba(239,68,68,0.1)" : "var(--bg2)", border: `0.5px solid ${mutedUsers.has(selectedUser.user_id) ? "rgba(239,68,68,0.3)" : "var(--border2)"}`, borderRadius: 7, padding: "7px", fontSize: "0.78rem", cursor: "pointer", fontFamily: "sans-serif", color: mutedUsers.has(selectedUser.user_id) ? "#EF4444" : "var(--text3)" }}>
              {mutedUsers.has(selectedUser.user_id) ? "Unmute" : "Mute"}
            </button>
          )}
        </div>
      </div>
    );
  };

  /* ── hand queue ── */
  const HandQueuePanel = () => handQueue.length === 0 ? null : (
    <div style={{ background: "rgba(217,119,6,0.06)", border: "0.5px solid rgba(217,119,6,0.25)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "0.65rem 1rem", borderBottom: "0.5px solid rgba(217,119,6,0.15)", display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#D97706", fontFamily: "sans-serif" }}>Hands raised · {handQueue.length}</span>
      </div>
      <div style={{ padding: "0.5rem" }}>
        {handQueue.map(h => (
          <div key={h.user_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.4rem 0.5rem", borderRadius: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Av id={h.user_id} name={h.display_name} size={28} />
              <span style={{ fontSize: "0.82rem", color: "var(--text)", fontFamily: "sans-serif" }}>{h.display_name}</span>
            </div>
            {isHost && (
              <div style={{ display: "flex", gap: 5 }}>
                <button onClick={() => setHandQueue(prev => prev.filter(q => q.user_id !== h.user_id))} style={{ background: "rgba(5,150,105,0.12)", color: "#059669", border: "0.5px solid rgba(5,150,105,0.3)", borderRadius: 5, padding: "3px 10px", fontSize: "0.72rem", cursor: "pointer", fontFamily: "sans-serif", fontWeight: 600 }}>Allow</button>
                <button onClick={() => setHandQueue(prev => prev.filter(q => q.user_id !== h.user_id))} style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "0.5px solid rgba(239,68,68,0.2)", borderRadius: 5, padding: "3px 10px", fontSize: "0.72rem", cursor: "pointer", fontFamily: "sans-serif" }}>Dismiss</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* ── TOP NAV ── */}
      <nav style={{ background: "var(--bg)", borderBottom: "1px solid var(--divider)", padding: "0.8rem 1.25rem", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 50, transition: "background 0.3s" }}>
        <button onClick={() => router.push("/rooms")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex", alignItems: "center", gap: 4, fontSize: "0.82rem", fontFamily: "sans-serif", flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Rooms
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" as const }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: room.status === "live" ? "rgba(5,150,105,0.12)" : ended ? "var(--bg2)" : "rgba(217,119,6,0.1)", border: `0.5px solid ${statusColor}30`, borderRadius: 100, padding: "2px 8px" }}>
              {room.status === "live" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#059669", display: "inline-block", animation: "pulse 1.5s infinite" }} />}
              <span style={{ fontSize: "0.65rem", fontWeight: 700, color: statusColor, fontFamily: "sans-serif", letterSpacing: "0.05em" }}>{statusLabel}</span>
            </span>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, maxWidth: "clamp(120px, 30vw, 300px)" }}>{room.title}</span>
          </div>
        </div>

        {/* Desktop: action buttons */}
        <div style={{ display: "flex", gap: 7, alignItems: "center", flexShrink: 0 }}>
          {!isHost && !ended && currentUser && (
            <button onClick={() => setTipOpen(true)} style={{ background: "#D97706", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", fontFamily: "sans-serif", display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              Tip
            </button>
          )}
          {isHost && !ended && (
            <button onClick={endRoom} disabled={ending} style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "7px 14px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", fontFamily: "sans-serif" }}>
              {ending ? "Ending..." : "End"}
            </button>
          )}
          <button onClick={leaveRoom} style={{ background: "transparent", color: "var(--text2)", border: "0.5px solid var(--border2)", borderRadius: 8, padding: "7px 14px", fontSize: "0.8rem", cursor: "pointer", fontFamily: "sans-serif" }}>
            Leave
          </button>
        </div>
      </nav>

      {/* ── ENDED BANNER ── */}
      {ended && (
        <div style={{ background: "rgba(239,68,68,0.07)", borderBottom: "0.5px solid rgba(239,68,68,0.2)", padding: "0.65rem 1.25rem" }}>
          <p style={{ fontSize: "0.82rem", color: "#EF4444", fontFamily: "sans-serif", margin: 0 }}>This room has ended. Chat is read-only.</p>
        </div>
      )}

      {/* ── MAIN LAYOUT ── */}
      <div style={{ background: "var(--bg)", minHeight: "calc(100vh - 56px)", transition: "background 0.3s" }}>
        {/* Desktop: 3-column grid */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.25rem", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,340px)", gap: "1.25rem" }}>

          {/* ── LEFT: Stage + controls ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", minWidth: 0 }}>

            {/* Host strip */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.85rem 1rem", background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: 12 }}>
              <Av id={room.profiles?.id ?? ""} name={room.profiles?.display_name ?? "Host"} url={room.profiles?.avatar_url} size={40} speaking={room.status === "live"} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.75rem", color: "#D97706", fontFamily: "sans-serif", fontWeight: 700, marginBottom: 1 }}>HOST</div>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, cursor: "pointer" }}
                  onClick={() => room.profiles?.id && router.push(`/profile/${room.profiles.id}`)}
                >
                  {room.profiles?.display_name ?? "Unknown"}
                </div>
              </div>
              <span style={{ display: "inline-block", background: "var(--bg2)", color: "var(--text3)", border: "0.5px solid var(--border)", borderRadius: 100, padding: "2px 8px", fontSize: "0.65rem", fontFamily: "sans-serif", textTransform: "capitalize" }}>{room.category}</span>
              <span style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{participants.length} in room</span>
            </div>

            {/* Hand queue */}
            <HandQueuePanel />

            {/* Participant grid */}
            <div style={{ background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "0.75rem 1rem", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text3)", fontFamily: "sans-serif" }}>Speakers & listeners</span>
                <span style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{participants.length}</span>
              </div>
              <ParticipantGrid />
            </div>

            {/* Selected user card */}
            {selectedUser && <UserCard />}

            {/* Bottom action bar */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "0.85rem 1rem", background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: 12 }}>
              {!isHost && !ended && currentUser && (
                <button onClick={toggleHand} style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  padding: "10px", borderRadius: 10, cursor: "pointer", fontFamily: "sans-serif",
                  fontSize: "0.88rem", fontWeight: 700,
                  background: myHandRaised ? "rgba(217,119,6,0.12)" : "var(--bg2)",
                  border: `1px solid ${myHandRaised ? "#D97706" : "var(--border2)"}`,
                  color: myHandRaised ? "#D97706" : "var(--text2)",
                  transition: "all 0.2s",
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8a6 6 0 0 0 12 0v-3a2 2 0 0 0-4 0v0"/></svg>
                  {myHandRaised ? "Lower hand" : "Raise hand to speak"}
                </button>
              )}
              {isHost && !ended && (
                <button onClick={endRoom} disabled={ending} style={{ flex: 1, background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "0.5px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "10px", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", fontFamily: "sans-serif" }}>
                  {ending ? "Ending..." : "End room for everyone"}
                </button>
              )}
            </div>
          </div>

          {/* ── RIGHT: Chat + Info ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <ChatPanel height="clamp(360px, 55vh, 520px)" />
            <InfoPanel />
          </div>
        </div>

        {/* ── MOBILE BOTTOM BAR ── */}
        <div style={{ display: "none", position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, background: "var(--bg)", borderTop: "0.5px solid var(--border)", padding: "0.6rem 1rem", gap: 8 }} className="mobile-bar">
          <button onClick={() => setMobilePanel(mobilePanel === "chat" ? null : "chat")} style={{ flex: 1, padding: "9px", borderRadius: 10, border: `0.5px solid ${mobilePanel === "chat" ? "#D97706" : "var(--border2)"}`, background: mobilePanel === "chat" ? "rgba(217,119,6,0.1)" : "var(--bg2)", color: mobilePanel === "chat" ? "#D97706" : "var(--text2)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" }}>
            💬 Chat {messages.length > 0 && `(${messages.length})`}
          </button>
          <button onClick={() => setMobilePanel(mobilePanel === "people" ? null : "people")} style={{ flex: 1, padding: "9px", borderRadius: 10, border: `0.5px solid ${mobilePanel === "people" ? "#D97706" : "var(--border2)"}`, background: mobilePanel === "people" ? "rgba(217,119,6,0.1)" : "var(--bg2)", color: mobilePanel === "people" ? "#D97706" : "var(--text2)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" }}>
            👥 People ({participants.length})
          </button>
          <button onClick={() => setMobilePanel(mobilePanel === "info" ? null : "info")} style={{ flex: 1, padding: "9px", borderRadius: 10, border: `0.5px solid ${mobilePanel === "info" ? "#D97706" : "var(--border2)"}`, background: mobilePanel === "info" ? "rgba(217,119,6,0.1)" : "var(--bg2)", color: mobilePanel === "info" ? "#D97706" : "var(--text2)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" }}>
            ℹ️ Info
          </button>
          {!isHost && !ended && currentUser && (
            <button onClick={() => setTipOpen(true)} style={{ padding: "9px 14px", borderRadius: 10, border: "none", background: "#D97706", color: "#fff", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: "sans-serif" }}>
              ❤️ Tip
            </button>
          )}
        </div>

        {/* ── MOBILE SLIDE-UP PANEL ── */}
        {mobilePanel && (
          <div onClick={e => { if ((e.target as HTMLElement).id === "mob-overlay") setMobilePanel(null); }} id="mob-overlay"
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 60, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <div style={{ background: "var(--bg)", borderRadius: "16px 16px 0 0", maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "0.75rem 1rem", borderBottom: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif" }}>
                  {mobilePanel === "chat" ? "Live chat" : mobilePanel === "people" ? `People (${participants.length})` : "Room info"}
                </span>
                <button onClick={() => setMobilePanel(null)} style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--text2)" }}>×</button>
              </div>
              <div style={{ flex: 1, overflow: "auto" }}>
                {mobilePanel === "chat" && <ChatPanel height="100%" />}
                {mobilePanel === "people" && (
                  <div>
                    <ParticipantGrid />
                    {selectedUser && <div style={{ padding: "0 1rem 1rem" }}><UserCard /></div>}
                  </div>
                )}
                {mobilePanel === "info" && (
                  <div style={{ padding: "1rem" }}>
                    <InfoPanel />
                    {!isHost && !ended && currentUser && (
                      <button onClick={() => { setMobilePanel(null); setTipOpen(true); }} style={{ width: "100%", marginTop: "1rem", background: "#D97706", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", fontFamily: "sans-serif" }}>
                        ❤️ Tip {room.profiles?.display_name}
                      </button>
                    )}
                    {!isHost && !ended && currentUser && (
                      <button onClick={toggleHand} style={{ width: "100%", marginTop: "0.75rem", background: myHandRaised ? "rgba(217,119,6,0.1)" : "var(--bg2)", color: myHandRaised ? "#D97706" : "var(--text2)", border: `1px solid ${myHandRaised ? "#D97706" : "var(--border2)"}`, borderRadius: 10, padding: "12px", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", fontFamily: "sans-serif" }}>
                        {myHandRaised ? "✋ Lower hand" : "✋ Raise hand to speak"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── TIP MODAL ── */}
      {tipOpen && (
        <div onClick={e => { if ((e.target as HTMLElement).id === "tip-ov") closeTip(); }} id="tip-ov"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "var(--bg)", borderRadius: 16, border: "0.5px solid var(--border)", width: "100%", maxWidth: 360, padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif" }}>Support {room.profiles?.display_name}</span>
              <button onClick={closeTip} style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--text2)" }}>×</button>
            </div>
            {tipSent ? (
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(5,150,105,0.12)", border: "0.5px solid rgba(5,150,105,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p style={{ color: "#059669", fontFamily: "sans-serif", fontWeight: 700, fontSize: "1rem", marginBottom: 4 }}>Tip sent!</p>
                <p style={{ color: "var(--text2)", fontSize: "0.82rem", fontFamily: "sans-serif", lineHeight: 1.6 }}>
                  USD ${parseFloat(tipAmount || "0").toFixed(2)} to {room.profiles?.display_name}<br/>
                  <span style={{ color: "var(--text3)" }}>via {tipPayment}</span>
                </p>
              </div>
            ) : tipStep === "amount" ? (
              <>
                <p style={{ fontSize: "0.78rem", color: "var(--text3)", fontFamily: "sans-serif", marginBottom: "1rem", lineHeight: 1.6 }}>~85% goes directly to the creator.</p>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text)", fontFamily: "sans-serif", marginBottom: "0.4rem" }}>Amount (USD)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.25rem" }}>
                  <span style={{ fontSize: "1rem", color: "var(--text3)", fontFamily: "sans-serif" }}>$</span>
                  <input type="number" min="0.10" step="0.10" value={tipAmount} onChange={e => setTipAmount(e.target.value)}
                    placeholder="e.g. 2.50"
                    style={{ flex: 1, background: "var(--bg2)", border: "0.5px solid var(--border2)", borderRadius: 8, padding: "10px 12px", fontSize: "1rem", color: "var(--text)", fontFamily: "sans-serif", outline: "none" }}
                  />
                </div>
                <button onClick={() => { if (parseFloat(tipAmount) > 0) setTipStep("method"); }}
                  disabled={!tipAmount || parseFloat(tipAmount) <= 0}
                  style={{ width: "100%", background: "#D97706", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: "0.92rem", fontWeight: 700, cursor: "pointer", fontFamily: "sans-serif", opacity: !tipAmount || parseFloat(tipAmount) <= 0 ? 0.5 : 1 }}>
                  Continue →
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setTipStep("amount")} style={{ background: "none", border: "none", color: "var(--text3)", fontSize: "0.78rem", fontFamily: "sans-serif", cursor: "pointer", padding: "0 0 0.75rem", display: "block" }}>← Back</button>
                <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text)", fontFamily: "sans-serif", marginBottom: "0.25rem" }}>
                  Sending USD ${parseFloat(tipAmount).toFixed(2)}
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--text3)", fontFamily: "sans-serif", marginBottom: "1rem" }}>Choose payment method</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: "1.25rem" }}>
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.id} onClick={() => setTipPayment(m.id)} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                      borderRadius: 10, cursor: "pointer", textAlign: "left" as const,
                      background: tipPayment === m.id ? "rgba(217,119,6,0.08)" : "var(--bg2)",
                      border: `0.5px solid ${tipPayment === m.id ? "#D97706" : "var(--border)"}`,
                      transition: "all 0.15s",
                    }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.88rem", fontWeight: 600, color: tipPayment === m.id ? "#D97706" : "var(--text)", fontFamily: "sans-serif" }}>{m.label}</div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{m.desc}</div>
                      </div>
                      {tipPayment === m.id && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                  ))}
                </div>
                <button onClick={sendTip} disabled={!tipPayment || tipLoading}
                  style={{ width: "100%", background: "#D97706", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: "0.92rem", fontWeight: 700, cursor: "pointer", fontFamily: "sans-serif", opacity: !tipPayment ? 0.5 : 1 }}>
                  {tipLoading ? "Processing..." : `Send $${parseFloat(tipAmount).toFixed(2)} via ${tipPayment || "..."}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @media (max-width: 700px) {
          .mobile-bar { display: flex !important; }
          [style*="grid-template-columns: minmax(0,1fr) minmax(0,340px)"] {
            grid-template-columns: 1fr !important;
          }
          [style*="grid-template-columns: minmax(0,1fr) minmax(0,340px)"] > div:last-child {
            display: none;
          }
          [style*="padding: 0.8rem 1.25rem"] {
            padding: 0.7rem 0.75rem !important;
          }
          [style*="maxWidth: 1100px"] {
            padding: 0.75rem !important;
            padding-bottom: 80px !important;
          }
        }
      `}</style>
    </>
  );
}
