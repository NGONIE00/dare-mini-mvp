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

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

const PAYMENT_METHODS = [
  { id: "EcoCash",  label: "EcoCash",  desc: "*151# · Zimbabwe",       color: "#D97706" },
  { id: "Mukuru",   label: "Mukuru",   desc: "Southern Africa",         color: "#059669" },
  { id: "OneMoney", label: "OneMoney", desc: "NetOne · Zimbabwe",       color: "#3B82F6" },
  { id: "Telecash", label: "Telecash", desc: "Telecel · Zimbabwe",      color: "#7C3AED" },
  { id: "M-Pesa",   label: "M-Pesa",   desc: "East Africa",             color: "#22C55E" },
  { id: "MTN MoMo", label: "MTN MoMo", desc: "West & Southern Africa",  color: "#F59E0B" },
];

/* ── Avatar ── */
const Av = ({
  id, name, url, size = 40, border = false, speaking = false,
}: { id: string; name: string; url?: string | null; size?: number; border?: boolean; speaking?: boolean }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
    background: AVATAR_COLOR(id), display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.33, fontWeight: 700, color: "#fff", fontFamily: "sans-serif",
    border: speaking ? `3px solid #059669` : border ? `2.5px solid #D97706` : "none",
    boxShadow: speaking ? "0 0 0 4px rgba(5,150,105,0.15)" : "none",
    transition: "box-shadow 0.3s, border 0.3s",
  }}>
    {url
      ? <img src={url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      : INITIALS(name)}
  </div>
);

/* ── Speaking wave icon ── */
const SpeakingWave = () => (
  <svg width="20" height="16" viewBox="0 0 20 16" fill="none" style={{ marginLeft: 2 }}>
    {[0,1,2,3,4].map((i) => (
      <rect key={i} x={i * 4} y={0} width="2.5" height="16" rx="1.25" fill="#059669"
        style={{ animation: `wave 1s ease-in-out ${i * 0.1}s infinite`, transformOrigin: "center" }}
      />
    ))}
  </svg>
);

export default function RoomPage() {
  const router  = useRouter();
  const params  = useParams();
  const roomId  = params.id as string;

  const [room,         setRoom]         = useState<Room | null>(null);
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [handQueue,    setHandQueue]    = useState<HandRaise[]>([]);
  const [currentUser,  setCurrentUser]  = useState<string | null>(null);
  const [currentName,  setCurrentName]  = useState("You");
  const [isHost,       setIsHost]       = useState(false);
  const [myHandRaised, setMyHandRaised] = useState(false);
  const [following,    setFollowing]    = useState<Set<string>>(new Set());
  const [mutedUsers,   setMutedUsers]   = useState<Set<string>>(new Set());
  const [loading,      setLoading]      = useState(true);
  const [ended,        setEnded]        = useState(false);
  const [ending,       setEnding]       = useState(false);
  const [chatInput,    setChatInput]    = useState("");
  const [sending,      setSending]      = useState(false);
  const [chatOpen,     setChatOpen]     = useState(false);
  const [selectedUser, setSelectedUser] = useState<Participant | null>(null);
  /* tip */
  const [tipOpen,    setTipOpen]    = useState(false);
  const [tipAmount,  setTipAmount]  = useState("");
  const [tipPayment, setTipPayment] = useState("");
  const [tipStep,    setTipStep]    = useState<"amount"|"method">("amount");
  const [tipSent,    setTipSent]    = useState(false);
  const [tipLoading, setTipLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  /* ── load ── */
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user.id);
        const { data: prof } = await supabase.from("profiles").select("display_name,avatar_url").eq("id", user.id).single();
        if (prof) setCurrentName(prof.display_name);
      }
      const { data: roomData } = await supabase.from("rooms")
        .select("*, profiles(id,display_name,avatar_url)").eq("id", roomId).single();
      if (!roomData) { router.push("/rooms"); return; }
      setRoom(roomData);
      setIsHost(user?.id === roomData.host_id);
      if (roomData.status === "ended") setEnded(true);
      const [{ data: msgs }, { data: parts }] = await Promise.all([
        supabase.from("messages").select("*, profiles(display_name,avatar_url)")
          .eq("room_id", roomId).order("created_at", { ascending: true }).limit(100),
        supabase.from("room_participants").select("*, profiles(id,display_name,avatar_url)")
          .eq("room_id", roomId),
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── actions ── */
  const sendMessage = async () => {
    if (!chatInput.trim() || !currentUser || sending) return;
    setSending(true);
    const text = chatInput.trim(); setChatInput("");
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
    setEnded(true); setEnding(false);
  };

  const leaveRoom = async () => {
    if (currentUser) await supabase.from("room_participants").delete().eq("room_id", roomId).eq("user_id", currentUser);
    router.push("/rooms");
  };

  const sendTip = async () => {
    if (!currentUser || !room || tipLoading || !tipAmount || !tipPayment) return;
    setTipLoading(true);
    await supabase.from("transactions").insert({
      from_user_id: currentUser, to_user_id: room.host_id, room_id: roomId,
      amount: parseFloat(tipAmount), transaction_type: "tip", status: "completed",
      reference: `tip-${Date.now()}`,
    });
    setTipSent(true); setTipLoading(false);
    setTimeout(() => { setTipOpen(false); setTipSent(false); setTipAmount(""); setTipPayment(""); setTipStep("amount"); }, 3000);
  };

  const closeTip = () => { setTipOpen(false); setTipStep("amount"); setTipPayment(""); };

  if (loading) return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "var(--text3)", fontFamily: "sans-serif", fontSize: "0.85rem" }}>Loading room...</p>
    </div>
  );
  if (!room) return null;

  const isLive = room.status === "live" && !ended;
  const hostProf = room.profiles;
  const nonHostParticipants = participants.filter(p => p.user_id !== room.host_id);

  /* ── CHAT PANEL ── */
  const ChatContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* header */}
      <div style={{ padding: "1rem 1.25rem 0.75rem", borderBottom: "1px solid var(--divider)", display: "flex", alignItems: "center", gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text3)", fontFamily: "sans-serif" }}>Live chat</span>
        <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif", fontWeight: 600 }}>{messages.length}</span>
      </div>
      {/* messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {messages.length === 0 && (
          <p style={{ textAlign: "center", color: "var(--text3)", fontSize: "0.82rem", fontFamily: "sans-serif", marginTop: "2rem" }}>No messages yet — say something!</p>
        )}
        {messages.map(msg => {
          const isMe = msg.user_id === currentUser;
          return (
            <div key={msg.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", flexDirection: isMe ? "row-reverse" : "row" }}>
              <Av id={msg.user_id} name={msg.profiles?.display_name ?? "?"} url={msg.profiles?.avatar_url} size={32} />
              <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", gap: 3, alignItems: isMe ? "flex-end" : "flex-start" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexDirection: isMe ? "row-reverse" : "row" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif" }}>
                    {isMe ? "You" : (msg.profiles?.display_name ?? "User")}
                  </span>
                  <span style={{ fontSize: "0.65rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{fmtTime(msg.created_at)}</span>
                </div>
                <div style={{
                  background: isMe ? "#D97706" : "var(--bg2)",
                  color: isMe ? "#fff" : "var(--text)",
                  borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  padding: "9px 13px", fontSize: "0.88rem", fontFamily: "sans-serif",
                  lineHeight: 1.55, wordBreak: "break-word" as const,
                  boxShadow: isMe ? "0 2px 8px rgba(217,119,6,0.25)" : "none",
                }}>
                  {msg.message}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>
      {/* input */}
      {!ended && currentUser ? (
        <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--divider)", display: "flex", gap: 8, alignItems: "center" }}>
          <input ref={inputRef} value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Type a message..."
            style={{ flex: 1, background: "var(--bg2)", border: "none", borderRadius: 24, padding: "10px 16px", fontSize: "0.88rem", color: "var(--text)", fontFamily: "sans-serif", outline: "none" }}
          />
          <button onClick={sendMessage} disabled={!chatInput.trim() || sending} style={{
            width: 38, height: 38, borderRadius: "50%", border: "none", flexShrink: 0,
            background: chatInput.trim() ? "#D97706" : "var(--bg2)",
            cursor: chatInput.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: chatInput.trim() ? "0 2px 8px rgba(217,119,6,0.35)" : "none",
            transition: "all 0.2s",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={chatInput.trim() ? "#fff" : "var(--text3)"} strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      ) : !currentUser ? (
        <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--divider)" }}>
          <button onClick={() => router.push("/register")} style={{ width: "100%", background: "#D97706", color: "#fff", border: "none", borderRadius: 24, padding: "10px", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", fontFamily: "sans-serif" }}>
            Sign in to chat
          </button>
        </div>
      ) : null}
    </div>
  );

  /* ── BOTTOM ACTION BAR ── */
  /* BottomBar:
     - Mobile (compact): Raise Hand | Chat | [spacer] | Tip (always shown, redirects to login if needed)
       Leave is removed from mobile — only accessible via nav
     - Desktop: same but Leave shown on right since there is more space
  */
  const BottomBar = ({ compact = false }: { compact?: boolean }) => (
    <div style={{
      display: "flex", alignItems: "center", gap: compact ? 6 : 8,
      padding: compact ? "0.75rem 1rem" : "0.85rem 1.25rem",
      borderTop: "1px solid var(--divider)",
      background: "var(--bg)",
    }}>
      {/* Raise hand — only when signed in + not host + not ended */}
      {!isHost && !ended && currentUser && (
        <button onClick={toggleHand} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: compact ? "9px 14px" : "10px 16px",
          borderRadius: 24, cursor: "pointer", fontFamily: "sans-serif",
          fontSize: compact ? "0.82rem" : "0.85rem", fontWeight: 600,
          background: myHandRaised ? "rgba(217,119,6,0.1)" : "var(--bg2)",
          border: `1.5px solid ${myHandRaised ? "#D97706" : "var(--border2)"}`,
          color: myHandRaised ? "#D97706" : "var(--text2)",
          transition: "all 0.2s", flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8a6 6 0 0 0 12 0v-3a2 2 0 0 0-4 0v0"/></svg>
          {myHandRaised ? "Lower Hand" : "Raise Hand"}
        </button>
      )}

      {/* Chat toggle */}
      <button onClick={() => setChatOpen(v => !v)} style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: compact ? "9px 14px" : "10px 16px",
        borderRadius: 24, cursor: "pointer", fontFamily: "sans-serif",
        fontSize: compact ? "0.82rem" : "0.85rem", fontWeight: 600,
        background: chatOpen ? "rgba(217,119,6,0.1)" : "var(--bg2)",
        border: `1.5px solid ${chatOpen ? "#D97706" : "var(--border2)"}`,
        color: chatOpen ? "#D97706" : "var(--text2)",
        transition: "all 0.2s", flexShrink: 0,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        Chat {messages.length > 0 ? messages.length : ""}
      </button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Tip — always visible when room is not ended and user is not host.
          If not signed in, redirect to register. */}
      {!isHost && !ended && (
        <button
          onClick={() => currentUser ? setTipOpen(true) : router.push("/register")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: compact ? "9px 16px" : "10px 18px",
            borderRadius: 24, border: "none", cursor: "pointer", fontFamily: "sans-serif",
            fontSize: compact ? "0.82rem" : "0.85rem", fontWeight: 700,
            background: "#D97706", color: "#fff",
            boxShadow: "0 2px 10px rgba(217,119,6,0.3)",
            flexShrink: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          Tip
        </button>
      )}

      {/* Host: end room */}
      {isHost && !ended && (
        <button onClick={endRoom} disabled={ending} style={{
          padding: compact ? "9px 16px" : "10px 18px", borderRadius: 24, fontFamily: "sans-serif",
          fontSize: compact ? "0.82rem" : "0.85rem", fontWeight: 700, cursor: "pointer",
          background: "rgba(239,68,68,0.1)", color: "#EF4444",
          border: "1.5px solid rgba(239,68,68,0.3)", flexShrink: 0,
        }}>
          {ending ? "Ending..." : "End Room"}
        </button>
      )}


    </div>
  );

  return (
    <>
      <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", flexDirection: "column", transition: "background 0.3s" }}>

        {/* ── TOP NAV ── */}
        <nav style={{ background: "var(--bg)", borderBottom: "1px solid var(--divider)", padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 50, transition: "background 0.3s" }}>
          <button onClick={() => router.push("/rooms")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)", display: "flex", alignItems: "center", gap: 4, fontSize: "0.85rem", fontFamily: "sans-serif", fontWeight: 500, flexShrink: 0, padding: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Rooms
          </button>
          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
            {isLive && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(5,150,105,0.1)", border: "0.5px solid rgba(5,150,105,0.3)", borderRadius: 100, padding: "3px 9px", flexShrink: 0 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#059669", display: "inline-block", animation: "livepulse 1.5s ease-in-out infinite" }} />
                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#059669", fontFamily: "sans-serif", letterSpacing: "0.04em" }}>Live</span>
              </span>
            )}
            {!isLive && !ended && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(217,119,6,0.1)", border: "0.5px solid rgba(217,119,6,0.3)", borderRadius: 100, padding: "3px 9px", flexShrink: 0 }}>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#D97706", fontFamily: "sans-serif" }}>Scheduled</span>
              </span>
            )}
            {ended && (
              <span style={{ display: "inline-flex", alignItems: "center", background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 100, padding: "3px 9px", flexShrink: 0 }}>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text3)", fontFamily: "sans-serif" }}>Ended</span>
              </span>
            )}
            <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
              {room.title}
            </span>
          </div>

        </nav>

        {/* ── BODY ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

          {/* ── MAIN CONTENT ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", minWidth: 0 }}>

            {/* Ended banner */}
            {ended && (
              <div style={{ background: "rgba(239,68,68,0.06)", borderBottom: "0.5px solid rgba(239,68,68,0.15)", padding: "0.6rem 1.25rem" }}>
                <p style={{ fontSize: "0.82rem", color: "#EF4444", fontFamily: "sans-serif", margin: 0 }}>This room has ended. Chat is read-only.</p>
              </div>
            )}

            {/* ── HOST HERO ── */}
            <div style={{ padding: "2rem 1.5rem 1.25rem", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              {/* Big host avatar */}
              <div style={{ position: "relative", marginBottom: "1rem", cursor: "pointer" }}
                onClick={() => hostProf?.id && router.push(`/profile/${hostProf.id}`)}>
                <div style={{
                  width: 110, height: 110, borderRadius: "50%", overflow: "hidden",
                  background: AVATAR_COLOR(hostProf?.id ?? "host"),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "2.2rem", fontWeight: 700, color: "#fff", fontFamily: "sans-serif",
                  border: isLive ? "3.5px solid #059669" : "3px solid var(--border2)",
                  boxShadow: isLive ? "0 0 0 6px rgba(5,150,105,0.12), 0 8px 32px rgba(0,0,0,0.12)" : "0 4px 20px rgba(0,0,0,0.1)",
                  transition: "border 0.3s, box-shadow 0.3s",
                }}>
                  {hostProf?.avatar_url
                    ? <img src={hostProf.avatar_url} alt={hostProf.display_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : INITIALS(hostProf?.display_name ?? "H")}
                </div>
                {/* HOST badge */}
                <div style={{ position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)", background: "#D97706", borderRadius: 100, padding: "2px 9px", whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#fff", fontFamily: "sans-serif", letterSpacing: "0.07em" }}>HOST</span>
                </div>
                {/* Speaking indicator */}
                {isLive && (
                  <div style={{ position: "absolute", bottom: 2, right: 2, background: "#059669", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--bg)" }}>
                    <svg width="12" height="10" viewBox="0 0 20 16" fill="none">
                      {[0,1,2,3,4].map(i => (
                        <rect key={i} x={i*4} y={i%2===0?3:0} width="2.5" height={i%2===0?10:16} rx="1.25" fill="#fff"
                          style={{ animation: `wave 0.8s ease-in-out ${i*0.12}s infinite alternate` }}
                        />
                      ))}
                    </svg>
                  </div>
                )}
              </div>

              {/* Host name */}
              <h1
                onClick={() => hostProf?.id && router.push(`/profile/${hostProf.id}`)}
                style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text)", margin: "0 0 0.25rem", fontFamily: "sans-serif", letterSpacing: "-0.02em", cursor: "pointer" }}>
                {hostProf?.display_name ?? "Host"}
              </h1>

              {/* Speaking status */}
              {isLive && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "1rem" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#059669", display: "inline-block", animation: "livepulse 1s ease-in-out infinite" }} />
                  <span style={{ fontSize: "0.82rem", color: "#059669", fontFamily: "sans-serif", fontWeight: 600 }}>Speaking...</span>
                </div>
              )}

              {/* Description */}
              {room.description && (
                <p style={{ fontSize: "0.9rem", color: "var(--text2)", fontFamily: "sans-serif", lineHeight: 1.65, maxWidth: 440, margin: "0 0 1.25rem", textAlign: "center" }}>
                  {room.description}
                </p>
              )}

              {/* Meta row */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" as const, justifyContent: "center", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span style={{ fontSize: "0.78rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{participants.length} in room</span>
                </div>
                <div style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--border2)" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
                  <span style={{ fontSize: "0.78rem", color: "var(--text3)", fontFamily: "sans-serif", textTransform: "capitalize" }}>{room.category}</span>
                </div>
                <div style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--border2)" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  <span style={{ fontSize: "0.78rem", color: "var(--text3)", fontFamily: "sans-serif", textTransform: "capitalize" }}>{room.language}</span>
                </div>
              </div>

              {/* Hand queue */}
              {handQueue.length > 0 && (
                <div style={{ width: "100%", maxWidth: 480, background: "rgba(217,119,6,0.06)", border: "0.5px solid rgba(217,119,6,0.2)", borderRadius: 12, padding: "0.75rem 1rem", marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#D97706", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: "0.5rem" }}>
                    ✋ Hands raised · {handQueue.length}
                  </div>
                  {handQueue.map(h => (
                    <div key={h.user_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.35rem 0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Av id={h.user_id} name={h.display_name} size={26} />
                        <span style={{ fontSize: "0.82rem", color: "var(--text)", fontFamily: "sans-serif" }}>{h.display_name}</span>
                      </div>
                      {isHost && (
                        <div style={{ display: "flex", gap: 5 }}>
                          <button onClick={() => setHandQueue(p => p.filter(q => q.user_id !== h.user_id))} style={{ background: "rgba(5,150,105,0.12)", color: "#059669", border: "0.5px solid rgba(5,150,105,0.3)", borderRadius: 20, padding: "3px 10px", fontSize: "0.72rem", cursor: "pointer", fontFamily: "sans-serif", fontWeight: 600 }}>Allow</button>
                          <button onClick={() => setHandQueue(p => p.filter(q => q.user_id !== h.user_id))} style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "0.5px solid rgba(239,68,68,0.2)", borderRadius: 20, padding: "3px 10px", fontSize: "0.72rem", cursor: "pointer", fontFamily: "sans-serif" }}>Dismiss</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── SPEAKERS / PARTICIPANTS ── */}
              {nonHostParticipants.length > 0 && (
                <div style={{ width: "100%", maxWidth: 520, marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", padding: "0 0.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif" }}>Speakers</span>
                      <span style={{ fontSize: "0.78rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{nonHostParticipants.length}</span>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                  {/* Horizontal scroll row */}
                  <div style={{ display: "flex", gap: "0.85rem", overflowX: "auto", paddingBottom: "0.5rem", scrollbarWidth: "none" as const }}>
                    {nonHostParticipants.map(p => {
                      const prof = p.profiles;
                      if (!prof) return null;
                      const isMe = p.user_id === currentUser;
                      const isSelected = selectedUser?.user_id === p.user_id;
                      return (
                        <div key={p.id} onClick={() => setSelectedUser(isSelected ? null : p)}
                          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer", flexShrink: 0, minWidth: 60 }}>
                          <div style={{ position: "relative" }}>
                            <Av id={prof.id} name={prof.display_name} url={prof.avatar_url} size={52} border={isSelected} />
                            {mutedUsers.has(p.user_id) && (
                              <div style={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, borderRadius: "50%", background: "#EF4444", border: "2px solid var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/></svg>
                              </div>
                            )}
                          </div>
                          <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text)", fontFamily: "sans-serif", textAlign: "center" }}>
                            {isMe ? "You" : prof.display_name.split(" ")[0]}
                          </span>
                          {!isMe && (
                            <button onClick={e => { e.stopPropagation(); toggleFollow(p.user_id); }} style={{
                              background: "none", border: "none", padding: 0, cursor: "pointer",
                              fontSize: "0.65rem", color: following.has(p.user_id) ? "var(--text3)" : "#D97706",
                              fontFamily: "sans-serif", fontWeight: 600,
                            }}>
                              {following.has(p.user_id) ? "Following" : "+ Follow"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected user action card */}
                  {selectedUser?.profiles && (
                    <div style={{ marginTop: "0.75rem", background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 14, padding: "0.9rem 1rem", display: "flex", alignItems: "center", gap: 10 }}>
                      <Av id={selectedUser.profiles.id} name={selectedUser.profiles.display_name} url={selectedUser.profiles.avatar_url} size={38} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif" }}>{selectedUser.profiles.display_name}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => router.push(`/profile/${selectedUser.profiles!.id}`)} style={{ background: "var(--bg)", border: "0.5px solid var(--border2)", borderRadius: 20, padding: "5px 12px", fontSize: "0.75rem", cursor: "pointer", fontFamily: "sans-serif", color: "var(--text2)", fontWeight: 600 }}>Profile</button>
                        {selectedUser.user_id !== currentUser && (
                          <button onClick={() => toggleFollow(selectedUser.user_id)} style={{ background: following.has(selectedUser.user_id) ? "transparent" : "#D97706", border: `0.5px solid ${following.has(selectedUser.user_id) ? "var(--border2)" : "#D97706"}`, borderRadius: 20, padding: "5px 12px", fontSize: "0.75rem", cursor: "pointer", fontFamily: "sans-serif", color: following.has(selectedUser.user_id) ? "var(--text3)" : "#fff", fontWeight: 600 }}>
                            {following.has(selectedUser.user_id) ? "Following ✓" : "+ Follow"}
                          </button>
                        )}
                        {isHost && selectedUser.user_id !== currentUser && (
                          <button onClick={() => { setMutedUsers(prev => { const n = new Set(prev); n.has(selectedUser.user_id) ? n.delete(selectedUser.user_id) : n.add(selectedUser.user_id); return n; }); }} style={{ background: mutedUsers.has(selectedUser.user_id) ? "rgba(239,68,68,0.1)" : "var(--bg)", border: `0.5px solid ${mutedUsers.has(selectedUser.user_id) ? "rgba(239,68,68,0.3)" : "var(--border2)"}`, borderRadius: 20, padding: "5px 12px", fontSize: "0.75rem", cursor: "pointer", fontFamily: "sans-serif", color: mutedUsers.has(selectedUser.user_id) ? "#EF4444" : "var(--text2)", fontWeight: 600 }}>
                            {mutedUsers.has(selectedUser.user_id) ? "Unmute" : "Mute"}
                          </button>
                        )}
                        <button onClick={() => setSelectedUser(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: "1rem", padding: "0 2px" }}>×</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom bar — always at bottom of main column */}
            <div style={{ marginTop: "auto" }}>
              <BottomBar compact={false} />
            </div>
          </div>

          {/* ── CHAT SIDEBAR (desktop: always visible, mobile: hidden) ── */}
          <div className="chat-sidebar" style={{
            width: 340, flexShrink: 0, borderLeft: "1px solid var(--divider)",
            display: "flex", flexDirection: "column", height: "100%",
          }}>
            <ChatContent />
          </div>
        </div>
      </div>

      {/* ── MOBILE CHAT PANEL (slide up) ── */}
      {chatOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div onClick={() => setChatOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
          <div style={{ position: "relative", background: "var(--bg)", borderRadius: "20px 20px 0 0", height: "75vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid var(--divider)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif" }}>Live chat</span>
              <button onClick={() => setChatOpen(false)} style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--text2)" }}>×</button>
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <ChatContent />
            </div>
          </div>
        </div>
      )}

      {/* ── TIP MODAL ── */}
      {tipOpen && (
        <div onClick={e => { if ((e.target as HTMLElement).id === "tip-bg") closeTip(); }} id="tip-bg"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 0 }}>
          <div style={{ background: "var(--bg)", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 440, padding: "1.5rem 1.5rem 2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Av id={hostProf?.id ?? ""} name={hostProf?.display_name ?? ""} url={hostProf?.avatar_url} size={36} />
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text3)", fontFamily: "sans-serif" }}>Supporting</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif" }}>{hostProf?.display_name}</div>
                </div>
              </div>
              <button onClick={closeTip} style={{ background: "var(--bg2)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", color: "var(--text2)", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>

            {tipSent ? (
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(5,150,105,0.1)", border: "1.5px solid rgba(5,150,105,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p style={{ color: "#059669", fontFamily: "sans-serif", fontWeight: 700, fontSize: "1.1rem", marginBottom: 6 }}>Tip sent!</p>
                <p style={{ color: "var(--text2)", fontSize: "0.88rem", fontFamily: "sans-serif", lineHeight: 1.6 }}>
                  USD ${parseFloat(tipAmount || "0").toFixed(2)} to {hostProf?.display_name}<br/>
                  <span style={{ color: "var(--text3)" }}>via {tipPayment} · 85% goes to creator</span>
                </p>
              </div>
            ) : tipStep === "amount" ? (
              <>
                <p style={{ fontSize: "0.82rem", color: "var(--text3)", fontFamily: "sans-serif", marginBottom: "1.25rem", lineHeight: 1.6 }}>
                  ~85% goes directly to the creator.
                </p>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif", marginBottom: "0.5rem" }}>
                  Amount (USD)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg2)", borderRadius: 14, padding: "2px 12px", marginBottom: "1.25rem", border: "1.5px solid var(--border)" }}>
                  <span style={{ fontSize: "1.2rem", color: "var(--text3)", fontFamily: "sans-serif" }}>$</span>
                  <input type="number" min="0.10" step="0.10" value={tipAmount}
                    onChange={e => setTipAmount(e.target.value)}
                    placeholder="0.00"
                    style={{ flex: 1, background: "none", border: "none", padding: "12px 4px", fontSize: "1.4rem", color: "var(--text)", fontFamily: "sans-serif", outline: "none", fontWeight: 700 }}
                  />
                </div>
                <button onClick={() => { if (parseFloat(tipAmount) > 0) setTipStep("method"); }}
                  disabled={!tipAmount || parseFloat(tipAmount) <= 0}
                  style={{ width: "100%", background: "#D97706", color: "#fff", border: "none", borderRadius: 14, padding: "14px", fontSize: "1rem", fontWeight: 700, cursor: "pointer", fontFamily: "sans-serif", opacity: !tipAmount || parseFloat(tipAmount) <= 0 ? 0.5 : 1, boxShadow: "0 4px 12px rgba(217,119,6,0.3)" }}>
                  Continue →
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setTipStep("amount")} style={{ background: "none", border: "none", color: "#D97706", fontSize: "0.82rem", fontFamily: "sans-serif", cursor: "pointer", padding: "0 0 0.75rem", display: "block", fontWeight: 600 }}>
                  ← Back
                </button>
                <div style={{ background: "var(--bg2)", borderRadius: 10, padding: "0.65rem 0.85rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--text2)", fontFamily: "sans-serif" }}>Sending</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#D97706", fontFamily: "sans-serif" }}>USD ${parseFloat(tipAmount).toFixed(2)}</span>
                </div>
                <p style={{ fontSize: "0.78rem", color: "var(--text3)", fontFamily: "sans-serif", marginBottom: "0.75rem", fontWeight: 600 }}>Choose payment method</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: "1.25rem" }}>
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.id} onClick={() => setTipPayment(m.id)} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
                      borderRadius: 12, cursor: "pointer", textAlign: "left" as const,
                      background: tipPayment === m.id ? "rgba(217,119,6,0.08)" : "var(--bg2)",
                      border: `1.5px solid ${tipPayment === m.id ? "#D97706" : "var(--border)"}`,
                      transition: "all 0.15s",
                    }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.9rem", fontWeight: 700, color: tipPayment === m.id ? "#D97706" : "var(--text)", fontFamily: "sans-serif" }}>{m.label}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{m.desc}</div>
                      </div>
                      {tipPayment === m.id && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </button>
                  ))}
                </div>
                <button onClick={sendTip} disabled={!tipPayment || tipLoading}
                  style={{ width: "100%", background: "#D97706", color: "#fff", border: "none", borderRadius: 14, padding: "14px", fontSize: "1rem", fontWeight: 700, cursor: "pointer", fontFamily: "sans-serif", opacity: !tipPayment ? 0.5 : 1, boxShadow: "0 4px 12px rgba(217,119,6,0.3)" }}>
                  {tipLoading ? "Processing..." : `Send $${parseFloat(tipAmount).toFixed(2)} via ${tipPayment || "..."}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes livepulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }
        @keyframes wave { 0%{transform:scaleY(0.4)} 100%{transform:scaleY(1)} }
        .chat-sidebar { display: flex !important; }
        .mobile-leave { display: none !important; }
        @media (max-width: 720px) {
          .chat-sidebar { display: none !important; }
          .mobile-leave { display: block !important; }
        }
        * { -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
      `}</style>
    </>
  );
}
