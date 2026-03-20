"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ThemeToggle";

const CATEGORIES = ["Health", "Agriculture", "Education", "News", "Community", "Entertainment", "Tech", "General"];
const LANGUAGES  = ["English", "Shona", "Ndebele", "Swahili", "French", "Arabic", "Portuguese"];
const DURATIONS  = ["30 min", "1 hour", "90 min", "2 hours", "Open-ended"];

export default function CreateRoom() {
  const router = useRouter();

  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [category,    setCategory]    = useState("Health");
  const [languages,   setLanguages]   = useState<string[]>(["English"]);
  const [date,        setDate]        = useState("");
  const [time,        setTime]        = useState("");
  const [duration,    setDuration]    = useState("1 hour");
  const [capacity,    setCapacity]    = useState("");
  const [ticketed,    setTicketed]    = useState(false);
  const [ticketPrice, setTicketPrice] = useState("");
  const [handRaise,   setHandRaise]   = useState(true);
  const [tipsAllowed, setTipsAllowed] = useState(true);
  const [recorded,    setRecorded]    = useState(false);
  const [openRoom,    setOpenRoom]    = useState(true);
  const [loading,     setLoading]     = useState(false);
  const [published,   setPublished]   = useState(false);
  const [errors,      setErrors]      = useState<Record<string, string>>({});

  const toggleLanguage = (lang: string) => {
    setLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const durationToMinutes = (d: string) => {
    if (d === "30 min")     return 30;
    if (d === "1 hour")     return 60;
    if (d === "90 min")     return 90;
    if (d === "2 hours")    return 120;
    return 0;
  };

  const previewDate = () => {
    if (!date || !time) return "—";
    const dt = new Date(`${date}T${time}`);
    return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) +
      " at " + dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim())  e.title = "Title is required";
    if (!date)          e.date  = "Date is required";
    if (!time)          e.time  = "Time is required";
    if (ticketed && !ticketPrice) e.price = "Enter a ticket price";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/register"); return; }

      const scheduledAt = new Date(`${date}T${time}`).toISOString();

      const { data, error } = await supabase.from("rooms").insert({
        host_id:          user.id,
        title:            title.trim(),
        description:      description.trim(),
        category:         category.toLowerCase(),
        language:         languages[0]?.toLowerCase() ?? "english",
        scheduled_at:     scheduledAt,
        duration_minutes: durationToMinutes(duration),
        capacity:         capacity ? parseInt(capacity) : 10000,
        is_ticketed:      ticketed,
        ticket_price:     ticketed ? parseFloat(ticketPrice) : 0,
        status:           "scheduled",
        participant_count: 0,
      }).select().single();

      if (error) throw error;
      setPublished(true);
      setTimeout(() => router.push(`/rooms/${data.id}`), 1500);
    } catch (err) {
      console.error(err);
      setErrors({ submit: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  /* ── shared style tokens ── */
  const s = {
    section:    { marginBottom: "2rem" } as React.CSSProperties,
    secLabel:   { fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#D97706", marginBottom: "0.9rem", paddingBottom: "0.5rem", borderBottom: "0.5px solid var(--border)" },
    field:      { marginBottom: "1.1rem" } as React.CSSProperties,
    label:      { display: "block", fontSize: "0.78rem", fontWeight: 600, marginBottom: "0.4rem", color: "var(--text)", fontFamily: "sans-serif" } as React.CSSProperties,
    hint:       { fontSize: "0.7rem", color: "var(--text3)", marginBottom: "0.4rem", display: "block", fontFamily: "sans-serif" } as React.CSSProperties,
    input:      { width: "100%", background: "var(--bg2)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "9px 11px", fontSize: "0.85rem", color: "var(--text)", fontFamily: "sans-serif", outline: "none", transition: "border-color 0.2s", boxSizing: "border-box" as const },
    textarea:   { width: "100%", background: "var(--bg2)", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "9px 11px", fontSize: "0.85rem", color: "var(--text)", fontFamily: "sans-serif", outline: "none", resize: "vertical" as const, minHeight: 80, boxSizing: "border-box" as const },
    error:      { fontSize: "0.72rem", color: "#EF4444", marginTop: 3, fontFamily: "sans-serif" } as React.CSSProperties,
    charCount:  { fontSize: "0.68rem", color: "var(--text3)", textAlign: "right" as const, marginTop: 3, fontFamily: "sans-serif" } as React.CSSProperties,
  };

  const Pill = ({ label, active, onClick, multi }: { label: string; active: boolean; onClick: () => void; multi?: boolean }) => (
    <button onClick={onClick} style={{
      background:   active ? "rgba(217,119,6,0.12)" : "var(--bg2)",
      border:       `0.5px solid ${active ? "#D97706" : "var(--border2)"}`,
      borderRadius: 100, padding: "5px 13px", fontSize: "0.75rem",
      cursor: "pointer", color: active ? "#D97706" : "var(--text2)",
      fontWeight: active ? 600 : 400, fontFamily: "sans-serif",
      transition: "all 0.15s",
    }}>{label}</button>
  );

  const Toggle = ({ on, onChange, label, desc }: { on: boolean; onChange: () => void; label: string; desc: string }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "0.5px solid var(--border)" }}>
      <div>
        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", fontFamily: "sans-serif" }}>{label}</div>
        <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: 2, fontFamily: "sans-serif" }}>{desc}</div>
      </div>
      <button onClick={onChange} style={{
        width: 36, height: 20, borderRadius: 100, border: "none", cursor: "pointer", flexShrink: 0,
        background: on ? "#D97706" : "var(--border2)", position: "relative", transition: "background 0.2s",
      }}>
        <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: on ? 19 : 3, transition: "left 0.2s", display: "block" }} />
      </button>
    </div>
  );

  const today = new Date().toISOString().split("T")[0];

  return (
    <>
      {/* NAV */}
      <nav style={{ background: "var(--bg)", borderBottom: "1px solid var(--divider)", padding: "0.9rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50, transition: "background 0.3s" }}>
        <div>
          <div style={{ color: "#D97706", fontSize: "1rem", fontWeight: 700, lineHeight: 1.1 }}>DARE</div>
          <div style={{ color: "var(--text3)", fontSize: "0.68rem", fontFamily: "sans-serif" }}>The Digital Council</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <ThemeToggle />
          <button onClick={() => router.push("/rooms")} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.8rem", color: "var(--text2)", background: "none", border: "0.5px solid var(--border2)", borderRadius: 5, padding: "6px 12px", cursor: "pointer", fontFamily: "sans-serif" }}>
            ← Back to rooms
          </button>
        </div>
      </nav>

      {/* PAGE */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "2rem 2rem 5rem" }}>
        <h1 style={{ fontSize: "clamp(1.4rem,3vw,1.9rem)", fontWeight: 700, color: "var(--text)", marginBottom: "0.3rem" }}>Start a room</h1>
        <p style={{ fontSize: "0.85rem", color: "var(--text2)", lineHeight: 1.6, marginBottom: "2rem", fontFamily: "sans-serif" }}>
          Anyone can host. Fill in the details below — your room will be visible to all Dare users once published.
        </p>

        {/* ── ROOM DETAILS ── */}
        <div style={s.section}>
          <div style={s.secLabel}>Room details</div>

          <div style={s.field}>
            <label style={s.label}>Room title <span style={{ color: "#EF4444" }}>*</span></label>
            <input style={s.input} maxLength={80} value={title} placeholder="e.g. Community Health Q&A with Dr. Tendai" onChange={e => setTitle(e.target.value)} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
              {errors.title && <span style={s.error}>{errors.title}</span>}
              <span style={{ ...s.charCount, marginLeft: "auto" }}>{title.length} / 80</span>
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Description</label>
            <span style={s.hint}>What will you discuss? What should listeners expect?</span>
            <textarea style={s.textarea} maxLength={300} value={description} placeholder="Describe your session in a few sentences..." onChange={e => setDescription(e.target.value)} />
            <div style={s.charCount}>{description.length} / 300</div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Category <span style={{ color: "#EF4444" }}>*</span></label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {CATEGORIES.map(c => (
                <Pill key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
              ))}
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Language(s)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {LANGUAGES.map(l => (
                <Pill key={l} label={l} multi active={languages.includes(l)} onClick={() => toggleLanguage(l)} />
              ))}
            </div>
          </div>
        </div>

        {/* ── SCHEDULE ── */}
        <div style={s.section}>
          <div style={s.secLabel}>Schedule</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.1rem" }}>
            <div>
              <label style={s.label}>Date <span style={{ color: "#EF4444" }}>*</span></label>
              <input type="date" style={s.input} min={today} value={date} onChange={e => setDate(e.target.value)} />
              {errors.date && <span style={s.error}>{errors.date}</span>}
            </div>
            <div>
              <label style={s.label}>Time <span style={{ color: "#EF4444" }}>*</span></label>
              <input type="time" style={s.input} value={time} onChange={e => setTime(e.target.value)} />
              {errors.time && <span style={s.error}>{errors.time}</span>}
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Duration</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {DURATIONS.map(d => (
                <Pill key={d} label={d} active={duration === d} onClick={() => setDuration(d)} />
              ))}
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Max listeners</label>
            <input type="number" style={{ ...s.input, maxWidth: 180 }} min={2} max={10000} value={capacity} placeholder="Unlimited" onChange={e => setCapacity(e.target.value)} />
          </div>
        </div>

        {/* ── ROOM SETTINGS ── */}
        <div style={s.section}>
          <div style={s.secLabel}>Room settings</div>

          <Toggle on={ticketed}    onChange={() => setTicketed(v => !v)}    label="Ticketed room"     desc="Charge listeners to join this session" />
          {ticketed && (
            <div style={{ padding: "0.75rem 0 0.25rem" }}>
              <label style={s.label}>Ticket price</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text3)", fontFamily: "sans-serif" }}>USD $</span>
                <input type="number" style={{ ...s.input, maxWidth: 120 }} min={0.5} max={50} step={0.5} value={ticketPrice} placeholder="1.00" onChange={e => setTicketPrice(e.target.value)} />
              </div>
              <span style={s.hint}>~85% goes directly to you after the platform fee</span>
              {errors.price && <span style={s.error}>{errors.price}</span>}
            </div>
          )}

          <Toggle on={handRaise}   onChange={() => setHandRaise(v => !v)}   label="Allow hand raising" desc="Listeners can request to speak" />
          <Toggle on={tipsAllowed} onChange={() => setTipsAllowed(v => !v)} label="Allow tips"          desc="Listeners can send tips during the session" />
          <Toggle on={recorded}    onChange={() => setRecorded(v => !v)}    label="Record session"     desc="Replay available after the room ends" />
          <div style={{ borderBottom: "none" }}>
            <Toggle on={openRoom}  onChange={() => setOpenRoom(v => !v)}    label="Open room"          desc="Anyone can join without approval" />
          </div>
        </div>

        {/* ── LIVE PREVIEW ── */}
        <div style={{ background: "var(--bg2)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", marginBottom: "0.75rem", fontFamily: "sans-serif" }}>Room preview</div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.4rem" }}>{title || "Your room title will appear here"}</div>
          <div style={{ marginBottom: "0.4rem" }}>
            <span style={{ display: "inline-block", background: "rgba(217,119,6,0.12)", color: "#D97706", border: "0.5px solid rgba(217,119,6,0.3)", borderRadius: 100, padding: "2px 8px", fontSize: "0.65rem", fontWeight: 600, fontFamily: "sans-serif" }}>{category}</span>
            {languages.slice(0, 2).map(l => (
              <span key={l} style={{ display: "inline-block", background: "var(--bg3)", color: "var(--text3)", border: "0.5px solid var(--border)", borderRadius: 100, padding: "2px 8px", fontSize: "0.65rem", fontFamily: "sans-serif", marginLeft: 4 }}>{l}</span>
            ))}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text2)", fontFamily: "sans-serif", lineHeight: 1.6 }}>
            Scheduled: {previewDate()} · Duration: {duration}
            {ticketed && ticketPrice && <> · <span style={{ color: "#D97706" }}>USD ${parseFloat(ticketPrice).toFixed(2)}</span></>}
          </div>
        </div>

        {/* ── SUBMIT ── */}
        {errors.submit && <p style={{ ...s.error, marginBottom: "0.75rem", textAlign: "center" }}>{errors.submit}</p>}
        <button
          onClick={handleSubmit}
          disabled={loading || published}
          style={{
            width: "100%", border: "none", borderRadius: 6, padding: "13px",
            fontSize: "0.95rem", fontWeight: 700, cursor: loading || published ? "default" : "pointer",
            fontFamily: "sans-serif", transition: "background 0.2s",
            background: published ? "#059669" : loading ? "var(--border2)" : "#D97706",
            color: loading ? "var(--text3)" : "#fff",
          }}
        >
          {published ? "Room published! Redirecting..." : loading ? "Publishing..." : "Publish room"}
        </button>
        <p style={{ textAlign: "center", fontSize: "0.7rem", color: "var(--text3)", marginTop: "0.75rem", fontFamily: "sans-serif" }}>
          Your room will be visible to all Dare users once published.
        </p>
      </div>
    </>
  );
}
