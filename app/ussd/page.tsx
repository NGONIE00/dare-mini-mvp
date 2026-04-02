"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/* ── USSD Menu Tree ── */
type Screen = {
  id: string;
  title: string;
  body: string;
  options?: { key: string; label: string; next: string }[];
  isEnd?: boolean;
  autoNext?: string; // auto-navigate after delay
  autoDelay?: number;
};

const SCREENS: Record<string, Screen> = {
  splash: {
    id: "splash",
    title: "",
    body: "Connecting to Dare...\n\nPlease wait.",
    autoNext: "home",
    autoDelay: 1800,
  },
  home: {
    id: "home",
    title: "DARE *447#",
    body: "Dare — The Digital Council\nVoice for every community.\n",
    options: [
      { key: "1", label: "Browse rooms", next: "browse" },
      { key: "2", label: "Join by code", next: "join_code" },
      { key: "3", label: "My profile", next: "profile" },
      { key: "4", label: "How it works", next: "howto" },
      { key: "0", label: "Exit", next: "exit" },
    ],
  },
  browse: {
    id: "browse",
    title: "Browse Rooms",
    body: "Live now:\n",
    options: [
      { key: "1", label: "Health Q&A - Dr. Tendai", next: "room_health" },
      { key: "2", label: "Farming Tips - Farai Choto", next: "room_farm" },
      { key: "3", label: "Digital Rights - Nomsa", next: "room_digital" },
      { key: "4", label: "More rooms...", next: "browse_more" },
      { key: "0", label: "Back", next: "home" },
    ],
  },
  browse_more: {
    id: "browse_more",
    title: "More Rooms",
    body: "Scheduled today:\n",
    options: [
      { key: "1", label: "News Roundup - 14:00", next: "room_news" },
      { key: "2", label: "Mental Health - 16:00", next: "room_mental" },
      { key: "3", label: "Travel Masterclass - $3", next: "room_travel_paid" },
      { key: "0", label: "Back", next: "browse" },
    ],
  },
  room_health: {
    id: "room_health",
    title: "Community Health Q&A",
    body: "Host: Dr. Tendai Moyo\nStatus: LIVE\nListeners: 34\nLanguage: English/Shona\n\nMalaria prevention in\nrural communities.",
    options: [
      { key: "1", label: "Listen (call joins)", next: "joining" },
      { key: "2", label: "Raise hand to speak", next: "hand_raise" },
      { key: "3", label: "Tip host (EcoCash)", next: "tip_menu" },
      { key: "0", label: "Back", next: "browse" },
    ],
  },
  room_farm: {
    id: "room_farm",
    title: "Small-Scale Farming Tips",
    body: "Host: Farai Choto\nStatus: LIVE\nListeners: 21\nLanguage: Shona\n\nSoil health & irrigation\nfor the dry season.",
    options: [
      { key: "1", label: "Listen (call joins)", next: "joining" },
      { key: "2", label: "Raise hand to speak", next: "hand_raise" },
      { key: "3", label: "Tip host (EcoCash)", next: "tip_menu" },
      { key: "0", label: "Back", next: "browse" },
    ],
  },
  room_digital: {
    id: "room_digital",
    title: "Digital Rights Workshop",
    body: "Host: Nomsa Dube\nStatus: LIVE\nListeners: 58\nLanguage: English\n\nProtecting your data\nand rights online.",
    options: [
      { key: "1", label: "Listen (call joins)", next: "joining" },
      { key: "2", label: "Raise hand to speak", next: "hand_raise" },
      { key: "3", label: "Tip host (EcoCash)", next: "tip_menu" },
      { key: "0", label: "Back", next: "browse" },
    ],
  },
  room_news: {
    id: "room_news",
    title: "Morning News Roundup",
    body: "Host: Tatenda Ncube\nStatus: Scheduled\nStarts: 14:00 today\nLanguage: English\n\nLocal governance &\ncommunity issues.",
    options: [
      { key: "1", label: "Set reminder (SMS)", next: "reminder_set" },
      { key: "0", label: "Back", next: "browse_more" },
    ],
  },
  room_mental: {
    id: "room_mental",
    title: "Mental Health Circle",
    body: "Host: Rudo Zimba\nStatus: Scheduled\nStarts: 16:00 today\nLanguage: English\n\nOpen circle for stress\nand anxiety support.",
    options: [
      { key: "1", label: "Set reminder (SMS)", next: "reminder_set" },
      { key: "0", label: "Back", next: "browse_more" },
    ],
  },
  room_travel_paid: {
    id: "room_travel_paid",
    title: "Travel Masterclass",
    body: "Host: Grace Thompson\nStatus: Scheduled\nStarts: 18:00 today\nTicket: USD $3.00\nPay via EcoCash/Mukuru\n\nSouthern Africa travel\nplanning deep-dive.",
    options: [
      { key: "1", label: "Buy ticket - EcoCash", next: "pay_ecocash" },
      { key: "2", label: "Buy ticket - Mukuru", next: "pay_mukuru" },
      { key: "0", label: "Back", next: "browse_more" },
    ],
  },
  pay_ecocash: {
    id: "pay_ecocash",
    title: "EcoCash Payment",
    body: "Amount: USD $3.00\nTo: Dare Digital Council\nRef: TRAVEL-001\n\nDial *151*2*1# on your\nEcoCash line to confirm\npayment of $3.00\n\nYou will receive an SMS\nwhen payment is confirmed.",
    options: [
      { key: "1", label: "I have paid", next: "pay_confirmed" },
      { key: "0", label: "Cancel", next: "room_travel_paid" },
    ],
  },
  pay_mukuru: {
    id: "pay_mukuru",
    title: "Mukuru Payment",
    body: "Amount: USD $3.00\nTo: Dare — ref TRAVEL-001\n\nSend via Mukuru app or\nagent. Use reference:\nDAREMVP001\n\nYou will receive an SMS\nwhen access is granted.",
    options: [
      { key: "1", label: "I have paid", next: "pay_confirmed" },
      { key: "0", label: "Cancel", next: "room_travel_paid" },
    ],
  },
  pay_confirmed: {
    id: "pay_confirmed",
    title: "Payment Received!",
    body: "Thank you.\n\nYou will receive an SMS\nwith access details for\nthe Travel Masterclass.\n\nSession starts 18:00.\nDial *447*8# to join.",
    options: [
      { key: "0", label: "Main menu", next: "home" },
    ],
  },
  joining: {
    id: "joining",
    title: "Joining Room...",
    body: "Connecting you to the\naudio session.\n\nYou will hear the room\nthrough your phone call.\n\nData used: ~8 KB/min\n(2G compatible)\n\nPress * to leave call.",
    autoNext: "in_room",
    autoDelay: 2500,
  },
  in_room: {
    id: "in_room",
    title: "You are listening",
    body: "* Dr. Tendai Moyo is\n  speaking now...\n\nAudio: 8 KB/min (2G)\nDuration: 00:03:42\n\nPress # to mute yourself\nPress * to leave room",
    options: [
      { key: "1", label: "Raise hand", next: "hand_raise" },
      { key: "2", label: "Tip host", next: "tip_menu" },
      { key: "9", label: "Leave room", next: "left_room" },
    ],
  },
  hand_raise: {
    id: "hand_raise",
    title: "Raise Hand",
    body: "Your hand has been\nraised.\n\nThe host will be notified\nthat you want to speak.\n\nYou will receive an SMS\nif granted permission.",
    options: [
      { key: "1", label: "Lower hand", next: "in_room" },
      { key: "0", label: "Back", next: "in_room" },
    ],
  },
  tip_menu: {
    id: "tip_menu",
    title: "Tip the Host",
    body: "Support Dr. Tendai Moyo\nfor this session.\n\n~85% goes to the host.",
    options: [
      { key: "1", label: "USD $0.50", next: "tip_confirm" },
      { key: "2", label: "USD $1.00", next: "tip_confirm" },
      { key: "3", label: "USD $2.00", next: "tip_confirm" },
      { key: "0", label: "Cancel", next: "in_room" },
    ],
  },
  tip_confirm: {
    id: "tip_confirm",
    title: "Confirm Tip",
    body: "Tip: USD $1.00\nTo: Dr. Tendai Moyo\nVia: EcoCash\n\nDial *151*2*1# to pay\n$1.00 to Dare.\nRef: TIP-001\n\nHost earns $0.85",
    options: [
      { key: "1", label: "Confirm", next: "tip_sent" },
      { key: "0", label: "Cancel", next: "in_room" },
    ],
  },
  tip_sent: {
    id: "tip_sent",
    title: "Tip Sent!",
    body: "USD $1.00 sent to\nDr. Tendai Moyo.\n\nThank you for supporting\nyour community host.\n\nDr. Tendai earns $0.85\nfrom this tip.",
    options: [
      { key: "0", label: "Back to room", next: "in_room" },
    ],
  },
  left_room: {
    id: "left_room",
    title: "Left Room",
    body: "You have left the room.\n\nSession duration: 05:17\nData used: ~2.5 KB\n\nThat's 95% less data\nthan streaming audio.",
    options: [
      { key: "1", label: "Browse more rooms", next: "browse" },
      { key: "0", label: "Main menu", next: "home" },
    ],
  },
  join_code: {
    id: "join_code",
    title: "Join by Room Code",
    body: "Enter the 6-digit room\ncode shared by the host:\n\n[e.g. 447001]\n\nCodes are shared via\nSMS or word of mouth.",
    options: [
      { key: "1", label: "Enter code: 447001", next: "room_health" },
      { key: "0", label: "Back", next: "home" },
    ],
  },
  profile: {
    id: "profile",
    title: "My Profile",
    body: "Name: Demo User\nPhone: +263 77X XXX XXX\nRole: Listener\nFollowing: 3 hosts\n\nWallet: USD $0.00\nSessions joined: 7",
    options: [
      { key: "1", label: "My session history", next: "history" },
      { key: "2", label: "Hosts I follow", next: "following" },
      { key: "0", label: "Back", next: "home" },
    ],
  },
  history: {
    id: "history",
    title: "Session History",
    body: "Recent sessions:\n\n1. Health Q&A - 12 Mar\n   Duration: 45 min\n\n2. Farming Tips - 10 Mar\n   Duration: 32 min\n\n3. Digital Rights - 8 Mar\n   Duration: 28 min",
    options: [{ key: "0", label: "Back", next: "profile" }],
  },
  following: {
    id: "following",
    title: "Hosts I Follow",
    body: "You follow:\n\n1. Dr. Tendai Moyo\n   Health · 34 followers\n\n2. Farai Choto\n   Agriculture · 21 followers\n\n3. Nomsa Dube\n   Education · 58 followers",
    options: [{ key: "0", label: "Back", next: "profile" }],
  },
  howto: {
    id: "howto",
    title: "How Dare Works",
    body: "Dare is a voice platform\nfor everyone.\n\n1. Dial *447# for free\n2. Browse live rooms\n3. Listen via phone call\n4. Pay hosts via EcoCash\n\nWorks on any phone.\nNo internet needed.\n~8 KB/min on 2G.",
    options: [
      { key: "1", label: "Browse rooms now", next: "browse" },
      { key: "0", label: "Back", next: "home" },
    ],
  },
  reminder_set: {
    id: "reminder_set",
    title: "Reminder Set",
    body: "You will receive an SMS\n15 minutes before the\nsession starts.\n\nDial *447# at that time\nto join the room.",
    options: [{ key: "0", label: "Main menu", next: "home" }],
  },
  exit: {
    id: "exit",
    title: "Goodbye",
    body: "Thank you for using Dare.\n\nDial *447# anytime\nto rejoin your community.\n\nDare — Every voice\ndeserves a seat.",
    isEnd: true,
  },
};

export default function USSDPage() {
  const router = useRouter();
  const [currentScreen, setCurrentScreen] = useState<Screen>(SCREENS.splash);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<Screen[]>([]);
  const [typing, setTyping] = useState(false);
  const [displayBody, setDisplayBody] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<string>("");

  /* ── typewriter effect ── */
  useEffect(() => {
    const target = currentScreen.body;
    bodyRef.current = target;
    setDisplayBody("");
    setTyping(true);
    let i = 0;
    const interval = setInterval(() => {
      if (i >= target.length || bodyRef.current !== target) {
        clearInterval(interval);
        setDisplayBody(target);
        setTyping(false);
        return;
      }
      setDisplayBody(target.slice(0, i + 1));
      i++;
    }, 18);
    return () => clearInterval(interval);
  }, [currentScreen]);

  /* ── auto-navigate ── */
  useEffect(() => {
    if (currentScreen.autoNext) {
      const t = setTimeout(() => {
        navigate(currentScreen.autoNext!);
      }, currentScreen.autoDelay ?? 2000);
      return () => clearTimeout(t);
    }
  }, [currentScreen]);

  const navigate = (screenId: string) => {
    const next = SCREENS[screenId];
    if (!next) return;
    setHistory(h => [...h, currentScreen]);
    setCurrentScreen(next);
    setInput("");
    inputRef.current?.focus();
  };

  const handleInput = (e: React.FormEvent) => {
    e.preventDefault();
    const val = input.trim();
    if (!val || !currentScreen.options) return;
    const opt = currentScreen.options.find(o => o.key === val);
    if (opt) navigate(opt.next);
    else setInput("");
  };

  const handleBack = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setCurrentScreen(prev);
    setInput("");
  };

  const reset = () => {
    setCurrentScreen(SCREENS.splash);
    setHistory([]);
    setInput("");
  };

  const lines = displayBody.split("\n");

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "2rem 1rem 4rem",
      fontFamily: "'Courier New', Courier, monospace",
    }}>

      {/* Back to app */}
      <div style={{ width: "100%", maxWidth: 480, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <button onClick={() => router.push("/")} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "0.8rem", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          dare.app
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D97706", animation: "pulse 2s infinite" }} />
          <span style={{ color: "#D97706", fontSize: "0.72rem", letterSpacing: "0.12em" }}>USSD SIMULATOR</span>
        </div>
      </div>

      {/* Phone frame */}
      <div style={{
        width: "100%",
        maxWidth: 340,
        background: "#1a1a1a",
        borderRadius: 40,
        padding: "12px",
        boxShadow: "0 0 0 1px #333, 0 40px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)",
        position: "relative",
      }}>

        {/* Earpiece */}
        <div style={{ width: 60, height: 6, borderRadius: 3, background: "#111", margin: "8px auto 14px", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.8)" }} />

        {/* Screen */}
        <div style={{
          background: "#1a1000",
          borderRadius: 12,
          padding: "1rem",
          minHeight: 260,
          border: "1px solid #2a1800",
          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.6), 0 0 20px rgba(217,119,6,0.08)",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Screen scanlines */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)", pointerEvents: "none", borderRadius: 12 }} />

          {/* Carrier bar */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", paddingBottom: "0.5rem", borderBottom: "1px solid #2a1800" }}>
            <span style={{ color: "#D97706", fontSize: "0.58rem", letterSpacing: "0.06em" }}>NetOne ZW</span>
            <span style={{ color: "#D97706", fontSize: "0.58rem" }}>▲▲▲▲ 2G</span>
            <span style={{ color: "#D97706", fontSize: "0.58rem" }}>🔋</span>
          </div>

          {/* USSD header */}
          {currentScreen.title && (
            <div style={{ color: "#D97706", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", marginBottom: "0.6rem", borderBottom: "1px solid #2a1800", paddingBottom: "0.4rem" }}>
              {currentScreen.title}
            </div>
          )}

          {/* Body text */}
          <div style={{ color: "#fbbf24", fontSize: "0.7rem", lineHeight: 1.7, marginBottom: "0.75rem", whiteSpace: "pre-wrap", minHeight: 80 }}>
            {displayBody}
            {typing && <span style={{ animation: "blink 0.8s infinite" }}>█</span>}
          </div>

          {/* Options */}
          {!typing && currentScreen.options && currentScreen.options.map(opt => (
            <div key={opt.key} style={{ display: "flex", gap: 8, marginBottom: "0.2rem" }}>
              <span style={{ color: "#D97706", fontSize: "0.68rem", fontWeight: 700, minWidth: 14 }}>{opt.key}.</span>
              <span style={{ color: "#fbbf24", fontSize: "0.68rem" }}>{opt.label}</span>
            </div>
          ))}

          {/* Auto-loading indicator */}
          {currentScreen.autoNext && !typing && (
            <div style={{ color: "#D97706", fontSize: "0.62rem", marginTop: "0.5rem", opacity: 0.7 }}>Loading...</div>
          )}

          {/* End screen */}
          {currentScreen.isEnd && !typing && (
            <div style={{ marginTop: "0.75rem" }}>
              <button onClick={reset} style={{ background: "none", border: "1px solid #D97706", color: "#D97706", borderRadius: 4, padding: "4px 10px", fontSize: "0.65rem", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em" }}>
                DIAL *447# AGAIN
              </button>
            </div>
          )}
        </div>

        {/* Input area */}
        <div style={{ marginTop: 12, padding: "0.6rem 0.75rem", background: "#111", borderRadius: 8, border: "1px solid #222" }}>
          <form onSubmit={handleInput} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#D97706", fontSize: "0.72rem", flexShrink: 0 }}>Enter:</span>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value.replace(/[^0-9*#]/g, ""))}
              placeholder="0-9"
              maxLength={6}
              disabled={!currentScreen.options || !!currentScreen.autoNext || typing}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "#D97706", fontSize: "0.8rem", fontFamily: "inherit",
                caretColor: "#D97706",
              }}
            />
            <button type="submit" disabled={!input || typing} style={{ background: "#92400e", border: "none", color: "#D97706", borderRadius: 4, padding: "3px 10px", fontSize: "0.68rem", cursor: "pointer", fontFamily: "inherit", opacity: !input ? 0.4 : 1 }}>
              OK
            </button>
          </form>
        </div>

        {/* Phone buttons row */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.9rem 1rem 0.5rem", gap: 8 }}>
          {/* Back / Clear */}
          <button onClick={handleBack} disabled={history.length === 0} style={{ flex: 1, background: "#222", border: "1px solid #333", color: history.length === 0 ? "#444" : "#888", borderRadius: 8, padding: "8px 4px", fontSize: "0.6rem", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em" }}>
            BACK
          </button>
          {/* Shortcut: tap a visible option */}
          <button onClick={reset} style={{ flex: 1, background: "#1a1a1a", border: "1px solid #333", color: "#555", borderRadius: 8, padding: "8px 4px", fontSize: "0.6rem", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em" }}>
            *447#
          </button>
          <button onClick={() => router.push("/rooms")} style={{ flex: 1, background: "#222", border: "1px solid #333", color: "#888", borderRadius: 8, padding: "8px 4px", fontSize: "0.6rem", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em" }}>
            APP
          </button>
        </div>

        {/* Home button */}
        <div style={{ display: "flex", justifyContent: "center", padding: "0.5rem 0 0.75rem" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid #333", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={reset}>
            <div style={{ width: 14, height: 14, borderRadius: 3, border: "1.5px solid #444" }} />
          </div>
        </div>
      </div>

      {/* Caption */}
      <div style={{ marginTop: "2rem", maxWidth: 340, textAlign: "center" }}>
        <p style={{ color: "#444", fontSize: "0.72rem", lineHeight: 1.7, margin: "0 0 0.5rem" }}>
          Simulating the Dare USSD experience on a basic feature phone. No smartphone, no data plan, no app store required.
        </p>
        <p style={{ color: "#333", fontSize: "0.65rem" }}>
          Production: NetOne · Econet · Telecel Zimbabwe
        </p>
      </div>

      {/* Grant context panel */}
      <div style={{ marginTop: "2rem", maxWidth: 480, width: "100%", background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "1.25rem 1.5rem" }}>
        <div style={{ color: "#D97706", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Why USSD matters for Zimbabwe</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          {[
            { stat: "~68%", label: "of Zimbabweans lack smartphone access" },
            { stat: "8 KB/min", label: "data use on 2G — vs 120 KB for streaming" },
            { stat: "$0", label: "data cost for USSD sessions" },
            { stat: "*447#", label: "works on any phone that can make a call" },
          ].map(s => (
            <div key={s.stat} style={{ background: "#0a0a0a", borderRadius: 8, padding: "0.75rem" }}>
              <div style={{ color: "#D97706", fontSize: "1rem", fontWeight: 700, fontFamily: "inherit" }}>{s.stat}</div>
              <div style={{ color: "#555", fontSize: "0.65rem", lineHeight: 1.5, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  );
}
