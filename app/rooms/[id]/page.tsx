"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Nav } from "@/components/Nav";

/* ── types ── */
type Room = {
  id: string;
  host_id: string;
  title: string;
  description: string;
  category: string;
  language: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  is_ticketed: boolean;
  ticket_price: number;
  participant_count: number;
  profiles: { id: string; display_name: string; avatar_url: string | null } | null;
};

type Message = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles?: { display_name: string; avatar_url: string | null };
};

type Participant = {
  id: string;
  user_id: string;
  joined_at: string;
  profiles?: { id: string; display_name: string; avatar_url: string | null };
};

type HandRaise = {
  id: string;
  user_id: string;
  display_name: string;
  raised_at: string;
};

/* ── helpers ── */
const INITIALS = (name: string) =>
  name.trim().split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

const AVATAR_COLOR = (id: string) => {
  const colors = ["#D97706","#059669","#3B82F6","#7C3AED","#EF4444","#EC4899","#0891B2","#65A30D"];
  let h = 0; for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
};

const Avatar = ({ id, name, url, size = 32 }: { id: string; name: string; url?: string | null; size?: number }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: AVATAR_COLOR(id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.34, fontWeight: 700, color: "#fff", fontFamily: "sans-serif" }}>
    {url ? <img src={url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : INITIALS(name)}
  </div>
);

const TIP_AMOUNTS = [0.5, 1, 2, 5];

export default function RoomPage() {
  const router  = useRouter();
  const params  = useParams();
  const roomId  = params.id as string;

  /* ── state ── */
  const [room,          setRoom]          = useState<Room | null>(null);
  const [messages,      setMessages]      = useState<Message[]>([]);
  const [participants,  setParticipants]  = useState<Participant[]>([]);
  const [handQueue,     setHandQueue]     = useState<HandRaise[]>([]);
  const [currentUser,   setCurrentUser]   = useState<string | null>(null);
  const [currentName,   setCurrentName]   = useState("You");
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const [isHost,        setIsHost]        = useState(false);
  const [myHandRaised,  setMyHandRaised]  = useState(false);
  const [following,     setFollowing]     = useState<Set<string>>(new Set());
  const [loading,       setLoading]       = useState(true);
  const [chatInput,     setChatInput]     = useState("");
  const [sending,       setSending]       = useState(false);
  const [tipOpen,       setTipOpen]       = useState(false);
  const [tipAmount,     setTipAmount]     = useState(1);
  const [tipSent,       setTipSent]       = useState(false);
  const [tipLoading,    setTipLoading]    = useState(false);
  const [infoOpen,      setInfoOpen]      = useState(false);
  const [participantOpen, setParticipantOpen] = useState(false);
  const [selectedUser,  setSelectedUser]  = useState<Participant | null>(null);
  const [mutedUsers,    setMutedUsers]    = useState<Set<string>>(new Set());
  const [ending,        setEnding]        = useState(false);
  const [ended,         setEnded]         = useState(false);
  const chatEndRef  = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  /* ── load room + join ── */
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user.id);
        const { data: prof } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).single();
        if (prof) { setCurrentName(prof.display_name); setCurrentAvatar(prof.avatar_url); }
      }

      const { data: roomData } = await supabase
        .from("rooms")
        .select("*, profiles(id, display_name, avatar_url)")
        .eq("id", roomId)
        .single();

      if (!roomData) { router.push("/rooms"); return; }
      setRoom(roomData);
      setIsHost(user?.id === roomData.host_id);
      if (roomData.status === "ended") setEnded(true);

      /* load messages */
      const { data: msgs } = await supabase
        .from("messages")
        .select("*, profiles(display_name, avatar_url)")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (msgs) setMessages(msgs);

      /* load participants */
      const { data: parts } = await supabase
        .from("room_participants")
        .select("*, profiles(id, display_name, avatar_url)")
        .eq("room_id", roomId);
      if (parts) setParticipants(parts);

      /* join room if logged in */
      if (user) {
        const already = parts?.find(p => p.user_id === user.id);
        if (!already) {
          await supabase.from("room_participants").insert({ room_id: roomId, user_id: user.id, payment_status: "free" });
          await supabase.from("rooms").update({ participant_count: (roomData.participant_count ?? 0) + 1 }).eq("id", roomId);
        }

        /* load follows */
        const { data: followData } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
        if (followData) setFollowing(new Set(followData.map(f => f.following_id)));
      }

      setLoading(false);
    };
    init();
  }, [roomId]);

  /* ── realtime subscriptions ── */
  useEffect(() => {
    const msgChannel = supabase
      .channel(`room-messages-${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        async (payload: { new: Message }) => {
          const { data: prof } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", payload.new.user_id).single();
          setMessages(prev => [...prev, { ...payload.new, profiles: prof ?? undefined }]);
        })
      .subscribe();

    /* hand raise channel via broadcast */
    const handChannel = supabase
      .channel(`hand-raise-${roomId}`)
      .on("broadcast", { event: "hand_raise" }, ({ payload }: { payload: HandRaise }) => {
        setHandQueue(prev => prev.find(h => h.user_id === payload.user_id) ? prev : [...prev, payload]);
      })
      .on("broadcast", { event: "hand_lower" }, ({ payload }: { payload: { user_id: string } }) => {
        setHandQueue(prev => prev.filter(h => h.user_id !== payload.user_id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(handChannel);
    };
  }, [roomId]);

  /* ── scroll chat to bottom ── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── send message ── */
  const sendMessage = async () => {
    if (!chatInput.trim() || !currentUser || sending) return;
    setSending(true);
    const text = chatInput.trim();
    setChatInput("");
    await supabase.from("messages").insert({ room_id: roomId, user_id: currentUser, message: text });
    setSending(false);
    inputRef.current?.focus();
  };

  /* ── raise / lower hand ── */
  const toggleHand = async () => {
    if (!currentUser) return;
    const channel = supabase.channel(`hand-raise-${roomId}`);
    if (myHandRaised) {
      await channel.send({ type: "broadcast", event: "hand_lower", payload: { user_id: currentUser } });
      setHandQueue(prev => prev.filter(h => h.user_id !== currentUser));
    } else {
      await channel.send({ type: "broadcast", event: "hand_raise", payload: { user_id: currentUser, display_name: currentName, raised_at: new Date().toISOString() } });
    }
    setMyHandRaised(v => !v);
  };

  /* ── host: approve speaker (removes from queue) ── */
  const approveSpeaker = (userId: string) => {
    setHandQueue(prev => prev.filter(h => h.user_id !== userId));
  };

  /* ── host: mute user ── */
  const toggleMute = (userId: string) => {
    setMutedUsers(prev => { const n = new Set(prev); n.has(userId) ? n.delete(userId) : n.add(userId); return n; });
  };

  /* ── host: end room ── */
  const endRoom = async () => {
    if (!isHost || ending) return;
    setEnding(true);
    await supabase.from("rooms").update({ status: "ended" }).eq("id", roomId);
    setEnded(true);
    setEnding(false);
  };

  /* ── leave room ── */
  const leaveRoom = async () => {
    if (currentUser) {
      await supabase.from("room_participants").delete().eq("room_id", roomId).eq("user_id", currentUser);
    }
    router.push("/rooms");
  };

  /* ── tip ── */
  const sendTip = async () => {
    if (!currentUser || !room || tipLoading) return;
    setTipLoading(true);
    await supabase.from("transactions").insert({
      from_user_id: currentUser,
      to_user_id: room.host_id,
      room_id: roomId,
      amount: tipAmount,
      transaction_type: "tip",
      status: "completed",
      reference: `tip-${Date.now()}`,
    });
    setTipSent(true);
    setTipLoading(false);
    setTimeout(() => { setTipOpen(false); setTipSent(false); }, 2000);
  };

  /* ── follow from participant panel ── */
  const toggleFollow = async (userId: string) => {
    if (!currentUser || userId === currentUser) return;
    if (following.has(userId)) {
      await supabase.from("follows").delete().eq("follower_id", currentUser).eq("following_id", userId);
      setFollowing(prev => { const n = new Set(prev); n.delete(userId); return n; });
    } else {
      await supabase.from("follows").insert({ follower_id: currentUser, following_id: userId });
      setFollowing(prev => new Set([...prev, userId]));
    }
  };

  /* ── style tokens ── */
  const panel: React.CSSProperties = { background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: 10, overflow: "hidden" };
  const secLabel: React.CSSProperties = { fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", fontFamily: "sans-serif" };
  const btnP: React.CSSProperties = { background: "#D97706", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif", transition: "background 0.2s" };
  const btnGhost: React.CSSProperties = { background: "transparent", color: "var(--text2)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "8px 16px", fontSize: "0.82rem", cursor: "pointer", fontFamily: "sans-serif", transition: "background 0.2s" };

  const formatTime = (d: string) => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  if (loading) return (
    <>
      <Nav />
      <div style={{ background: "var(--bg)", minHeight: "calc(100vh - 60px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text3)", fontFamily: "sans-serif", fontSize: "0.85rem" }}>Loading room...</p>
      </div>
    </>
  );

  if (!room) return null;

  return (
    <>
      <Nav />
      <div style={{ background: "var(--bg)", minHeight: "calc(100vh - 60px)", transition: "background 0.3s" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "1.5rem 1.5rem 5rem" }}>

          {/* ── ROOM HEADER ── */}
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: "0.3rem" }}>
                  <h1 style={{ fontSize: "clamp(1.1rem,2.5vw,1.5rem)", fontWeight: 700, color: "var(--text)", margin: 0 }}>{room.title}</h1>
                  <span style={{
                    background: ended ? "var(--bg2)" : room.status === "live" ? "rgba(5,150,105,0.12)" : "rgba(217,119,6,0.12)",
                    color: ended ? "var(--text3)" : room.status === "live" ? "#059669" : "#D97706",
                    border: `0.5px solid ${ended ? "var(--border)" : room.status === "live" ? "rgba(5,150,105,0.3)" : "rgba(217,119,6,0.3)"}`,
                    borderRadius: 100, padding: "2px 8px", fontSize: "0.62rem", fontWeight: 600, fontFamily: "sans-serif", whiteSpace: "nowrap",
                  }}>
                    {ended ? "Ended" : room.status === "live" ? "Live now" : "Scheduled"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => room.profiles?.id && router.push(`/profile/${room.profiles.id}`)}>
                    <Avatar id={room.profiles?.id ?? ""} name={room.profiles?.display_name ?? "Host"} url={room.profiles?.avatar_url} size={22} />
                    <span style={{ fontSize: "0.78rem", color: "var(--text2)", fontFamily: "sans-serif" }}>{room.profiles?.display_name}</span>
                    {isHost && <span style={{ background: "rgba(217,119,6,0.1)", color: "#D97706", fontSize: "0.6rem", fontWeight: 600, padding: "1px 6px", borderRadius: 100, fontFamily: "sans-serif" }}>You</span>}
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{participants.length} in room</span>
                  <span style={{ display: "inline-block", background: "var(--bg2)", color: "var(--text3)", border: "0.5px solid var(--border)", borderRadius: 100, padding: "1px 7px", fontSize: "0.62rem", fontFamily: "sans-serif", textTransform: "capitalize" }}>{room.category}</span>
                </div>
              </div>

              {/* Header actions */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={() => setInfoOpen(v => !v)} style={{ ...btnGhost, padding: "6px 12px", fontSize: "0.76rem" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: "middle", marginRight: 4 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Info
                </button>
                <button onClick={() => setParticipantOpen(v => !v)} style={{ ...btnGhost, padding: "6px 12px", fontSize: "0.76rem" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: "middle", marginRight: 4 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  {participants.length}
                </button>
                {!isHost && !ended && (
                  <button onClick={() => setTipOpen(v => !v)} style={{ ...btnP, padding: "6px 12px", fontSize: "0.76rem" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: "middle", marginRight: 4 }}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    Tip host
                  </button>
                )}
                {isHost && !ended && (
                  <button onClick={endRoom} disabled={ending} style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "6px 12px", fontSize: "0.76rem", fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" }}>
                    {ending ? "Ending..." : "End room"}
                  </button>
                )}
                <button onClick={leaveRoom} style={{ ...btnGhost, padding: "6px 12px", fontSize: "0.76rem", color: "#EF4444", borderColor: "rgba(239,68,68,0.3)" }}>
                  Leave
                </button>
              </div>
            </div>

            {/* Ended banner */}
            {ended && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "0.75rem 1rem", marginTop: "0.75rem" }}>
                <p style={{ fontSize: "0.82rem", color: "#EF4444", fontFamily: "sans-serif", margin: 0 }}>This room has ended. The chat is read-only.</p>
              </div>
            )}
          </div>

          {/* ── MAIN GRID ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(240px, 300px)", gap: "1rem" }}>

            {/* ── LEFT: CHAT ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", minWidth: 0 }}>

              {/* Hand raise queue — visible to all, controls for host */}
              {handQueue.length > 0 && (
                <div style={{ ...panel, border: "0.5px solid rgba(217,119,6,0.3)" }}>
                  <div style={{ padding: "0.75rem 1rem", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8a6 6 0 0 0 12 0v-3a2 2 0 0 0-4 0v0"/></svg>
                    <span style={{ ...secLabel, color: "#D97706" }}>Hand queue — {handQueue.length}</span>
                  </div>
                  <div style={{ padding: "0.5rem 1rem" }}>
                    {handQueue.map(h => (
                      <div key={h.user_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "0.5px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar id={h.user_id} name={h.display_name} size={26} />
                          <span style={{ fontSize: "0.82rem", color: "var(--text)", fontFamily: "sans-serif" }}>{h.display_name}</span>
                        </div>
                        {isHost && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => approveSpeaker(h.user_id)} style={{ background: "rgba(5,150,105,0.12)", color: "#059669", border: "0.5px solid rgba(5,150,105,0.3)", borderRadius: 4, padding: "3px 10px", fontSize: "0.72rem", cursor: "pointer", fontFamily: "sans-serif" }}>Allow</button>
                            <button onClick={() => setHandQueue(prev => prev.filter(q => q.user_id !== h.user_id))} style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "0.5px solid rgba(239,68,68,0.2)", borderRadius: 4, padding: "3px 10px", fontSize: "0.72rem", cursor: "pointer", fontFamily: "sans-serif" }}>Dismiss</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat panel */}
              <div style={{ ...panel, display: "flex", flexDirection: "column", height: "clamp(380px, 55vh, 520px)" }}>
                <div style={{ padding: "0.75rem 1rem", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <span style={secLabel}>Live chat</span>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {messages.length === 0 && (
                    <div style={{ textAlign: "center", color: "var(--text3)", fontSize: "0.78rem", fontFamily: "sans-serif", marginTop: "2rem" }}>
                      No messages yet. Say something!
                    </div>
                  )}
                  {messages.map(msg => {
                    const isMe = msg.user_id === currentUser;
                    return (
                      <div key={msg.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", flexDirection: isMe ? "row-reverse" : "row" }}>
                        <Avatar id={msg.user_id} name={msg.profiles?.display_name ?? "?"} url={msg.profiles?.avatar_url} size={28} />
                        <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", gap: 2 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexDirection: isMe ? "row-reverse" : "row" }}>
                            <span style={{ fontSize: "0.72rem", fontWeight: 600, color: isMe ? "#D97706" : "var(--text2)", fontFamily: "sans-serif" }}>
                              {isMe ? "You" : msg.profiles?.display_name ?? "User"}
                            </span>
                            <span style={{ fontSize: "0.62rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{formatTime(msg.created_at)}</span>
                          </div>
                          <div style={{
                            background: isMe ? "rgba(217,119,6,0.12)" : "var(--bg2)",
                            border: `0.5px solid ${isMe ? "rgba(217,119,6,0.25)" : "var(--border)"}`,
                            borderRadius: isMe ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                            padding: "7px 11px", fontSize: "0.84rem", color: "var(--text)",
                            fontFamily: "sans-serif", lineHeight: 1.5, wordBreak: "break-word",
                          }}>
                            {msg.message}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                {!ended && currentUser && (
                  <div style={{ padding: "0.75rem 1rem", borderTop: "0.5px solid var(--border)", display: "flex", gap: 8 }}>
                    <input
                      ref={inputRef}
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                      placeholder="Say something..."
                      maxLength={400}
                      style={{ flex: 1, background: "var(--bg2)", border: "0.5px solid var(--border2)", borderRadius: 20, padding: "8px 14px", fontSize: "0.84rem", color: "var(--text)", fontFamily: "sans-serif", outline: "none" }}
                    />
                    <button onClick={sendMessage} disabled={!chatInput.trim() || sending} style={{
                      width: 36, height: 36, borderRadius: "50%", border: "none", cursor: chatInput.trim() ? "pointer" : "default",
                      background: chatInput.trim() ? "#D97706" : "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s",
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={chatInput.trim() ? "#fff" : "var(--text3)"} strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                  </div>
                )}
                {!currentUser && (
                  <div style={{ padding: "0.75rem 1rem", borderTop: "0.5px solid var(--border)", textAlign: "center" }}>
                    <button onClick={() => router.push("/register")} style={{ ...btnP, width: "100%", padding: "8px" }}>Sign in to chat</button>
                  </div>
                )}
              </div>

              {/* Raise hand — listener only */}
              {!isHost && !ended && currentUser && (
                <button onClick={toggleHand} style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  width: "100%", padding: "11px",
                  background: myHandRaised ? "rgba(217,119,6,0.1)" : "var(--bg2)",
                  border: `1px solid ${myHandRaised ? "#D97706" : "var(--border2)"}`,
                  borderRadius: 8, cursor: "pointer", fontFamily: "sans-serif",
                  fontSize: "0.88rem", fontWeight: 600,
                  color: myHandRaised ? "#D97706" : "var(--text2)",
                  transition: "all 0.2s",
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8a6 6 0 0 0 12 0v-3a2 2 0 0 0-4 0v0"/></svg>
                  {myHandRaised ? "Lower hand" : "Raise hand to speak"}
                </button>
              )}
            </div>

            {/* ── RIGHT SIDEBAR ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

              {/* Room info panel */}
              {infoOpen && (
                <div style={panel}>
                  <div style={{ padding: "0.75rem 1rem", borderBottom: "0.5px solid var(--border)" }}>
                    <span style={secLabel}>Room info</span>
                  </div>
                  <div style={{ padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {[
                      { label: "Category",    value: room.category,       cap: true },
                      { label: "Language",    value: room.language,       cap: true },
                      { label: "Date",        value: formatDate(room.scheduled_at) },
                      { label: "Time",        value: formatTime(room.scheduled_at) },
                      { label: "Duration",    value: room.duration_minutes ? `${room.duration_minutes} min` : "Open-ended" },
                      { label: "Ticket",      value: room.is_ticketed ? `USD $${room.ticket_price.toFixed(2)}` : "Free" },
                    ].map(item => (
                      <div key={item.label}>
                        <div style={{ fontSize: "0.62rem", fontWeight: 600, color: "var(--text3)", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: 2 }}>{item.label}</div>
                        <div style={{ fontSize: "0.82rem", color: "var(--text)", fontFamily: "sans-serif", textTransform: item.cap ? "capitalize" : "none" }}>{item.value}</div>
                      </div>
                    ))}
                    {room.description && (
                      <div>
                        <div style={{ fontSize: "0.62rem", fontWeight: 600, color: "var(--text3)", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: 2 }}>About</div>
                        <div style={{ fontSize: "0.82rem", color: "var(--text2)", fontFamily: "sans-serif", lineHeight: 1.6 }}>{room.description}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Participant list */}
              {participantOpen && (
                <div style={panel}>
                  <div style={{ padding: "0.75rem 1rem", borderBottom: "0.5px solid var(--border)" }}>
                    <span style={secLabel}>In this room</span>
                  </div>
                  <div style={{ maxHeight: 320, overflowY: "auto" }}>
                    {participants.map(p => {
                      const prof = p.profiles;
                      if (!prof) return null;
                      const isCurrentUser = p.user_id === currentUser;
                      const isRoomHost = p.user_id === room.host_id;
                      const isFollowed = following.has(p.user_id);
                      return (
                        <div key={p.id} style={{ padding: "0.65rem 1rem", borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flex: 1, minWidth: 0 }} onClick={() => setSelectedUser(selectedUser?.user_id === p.user_id ? null : p)}>
                            <Avatar id={prof.id} name={prof.display_name} url={prof.avatar_url} size={28} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", fontFamily: "sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prof.display_name}</div>
                              {isRoomHost && <div style={{ fontSize: "0.62rem", color: "#D97706", fontFamily: "sans-serif" }}>Host</div>}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                            {!isCurrentUser && !isRoomHost && (
                              <button onClick={() => toggleFollow(p.user_id)} style={{
                                background: isFollowed ? "transparent" : "rgba(217,119,6,0.1)",
                                border: `0.5px solid ${isFollowed ? "var(--border2)" : "#D97706"}`,
                                borderRadius: 4, padding: "3px 8px", fontSize: "0.68rem",
                                cursor: "pointer", fontFamily: "sans-serif",
                                color: isFollowed ? "var(--text3)" : "#D97706",
                                fontWeight: 600, transition: "all 0.15s",
                              }}>
                                {isFollowed ? "Following" : "+ Follow"}
                              </button>
                            )}
                            {isHost && !isCurrentUser && (
                              <button onClick={() => toggleMute(p.user_id)} style={{
                                background: mutedUsers.has(p.user_id) ? "rgba(239,68,68,0.1)" : "var(--bg2)",
                                border: `0.5px solid ${mutedUsers.has(p.user_id) ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
                                borderRadius: 4, padding: "3px 8px", fontSize: "0.68rem",
                                cursor: "pointer", fontFamily: "sans-serif",
                                color: mutedUsers.has(p.user_id) ? "#EF4444" : "var(--text3)",
                              }}>
                                {mutedUsers.has(p.user_id) ? "Muted" : "Mute"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Mini profile card on tap */}
                  {selectedUser?.profiles && (
                    <div style={{ padding: "0.75rem 1rem", borderTop: "0.5px solid var(--border)", background: "var(--bg2)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "0.5rem" }}>
                        <Avatar id={selectedUser.profiles.id} name={selectedUser.profiles.display_name} url={selectedUser.profiles.avatar_url} size={36} />
                        <div>
                          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif" }}>{selectedUser.profiles.display_name}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => router.push(`/profile/${selectedUser.profiles!.id}`)} style={{ ...btnGhost, flex: 1, padding: "6px", fontSize: "0.75rem", textAlign: "center" as const }}>View profile</button>
                        {selectedUser.user_id !== currentUser && (
                          <button onClick={() => toggleFollow(selectedUser.user_id)} style={{ ...btnP, flex: 1, padding: "6px", fontSize: "0.75rem" }}>
                            {following.has(selectedUser.user_id) ? "Following ✓" : "+ Follow"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Host control panel */}
              {isHost && !ended && (
                <div style={{ ...panel, border: "0.5px solid rgba(217,119,6,0.25)" }}>
                  <div style={{ padding: "0.75rem 1rem", borderBottom: "0.5px solid var(--border)", background: "rgba(217,119,6,0.04)" }}>
                    <span style={{ ...secLabel, color: "#D97706" }}>Host controls</span>
                  </div>
                  <div style={{ padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    <div style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif" }}>
                      {handQueue.length > 0 ? `${handQueue.length} hand${handQueue.length > 1 ? "s" : ""} raised` : "No hands raised"}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif" }}>
                      {mutedUsers.size > 0 ? `${mutedUsers.size} participant${mutedUsers.size > 1 ? "s" : ""} muted` : "All participants unmuted"}
                    </div>
                    <button onClick={() => { setParticipantOpen(true); }} style={{ ...btnGhost, width: "100%", padding: "7px", fontSize: "0.78rem", textAlign: "center" as const }}>
                      Manage participants
                    </button>
                    <button onClick={endRoom} disabled={ending} style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "0.5px solid rgba(239,68,68,0.25)", borderRadius: 6, padding: "7px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif", width: "100%" }}>
                      {ending ? "Ending..." : "End room for everyone"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── TIP MODAL ── */}
          {tipOpen && (
            <div onClick={e => { if ((e.target as HTMLElement).id === "tip-overlay") setTipOpen(false); }} id="tip-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
              <div style={{ background: "var(--bg)", borderRadius: 12, border: "0.5px solid var(--border)", width: "100%", maxWidth: 340, padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif" }}>Tip {room.profiles?.display_name}</span>
                  <button onClick={() => setTipOpen(false)} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text2)" }}>×</button>
                </div>
                {tipSent ? (
                  <div style={{ textAlign: "center", padding: "1rem 0" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✓</div>
                    <p style={{ color: "#059669", fontFamily: "sans-serif", fontWeight: 600 }}>Tip sent!</p>
                    <p style={{ color: "var(--text3)", fontSize: "0.78rem", fontFamily: "sans-serif", marginTop: 4 }}>USD ${tipAmount.toFixed(2)} sent to {room.profiles?.display_name}</p>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: "0.78rem", color: "var(--text3)", fontFamily: "sans-serif", marginBottom: "1.25rem", lineHeight: 1.6 }}>
                      Support this creator directly. ~85% goes to them.
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: "1.25rem" }}>
                      {TIP_AMOUNTS.map(amt => (
                        <button key={amt} onClick={() => setTipAmount(amt)} style={{
                          padding: "10px 4px", borderRadius: 6, cursor: "pointer", fontFamily: "sans-serif",
                          background: tipAmount === amt ? "rgba(217,119,6,0.12)" : "var(--bg2)",
                          border: `0.5px solid ${tipAmount === amt ? "#D97706" : "var(--border2)"}`,
                          color: tipAmount === amt ? "#D97706" : "var(--text2)",
                          fontWeight: tipAmount === amt ? 700 : 400, fontSize: "0.85rem",
                        }}>
                          ${amt}
                        </button>
                      ))}
                    </div>
                    <button onClick={sendTip} disabled={tipLoading} style={{ ...btnP, width: "100%", padding: "11px" }}>
                      {tipLoading ? "Sending..." : `Send $${tipAmount.toFixed(2)} tip`}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
