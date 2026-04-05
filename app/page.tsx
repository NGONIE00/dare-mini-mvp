"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

/* ── ThemeToggle inlined to avoid provider dependency on this page ── */
function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("dare-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefersDark;
    setDark(isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    const theme = next ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("dare-theme", theme);
  };
  return (
    <button onClick={toggle} title={dark ? "Switch to light" : "Switch to dark"} style={{
      width: 34, height: 34, borderRadius: "50%", cursor: "pointer",
      background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
      border: `0.5px solid ${dark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.18)"}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "background 0.2s", flexShrink: 0,
    }}>
      {dark
        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#525252" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      }
    </button>
  );
}

/* ── types ── */
type Room = { title: string; host: string; category: string; status: "live"|"soon"; participants: number; lang: string };

/* ── static data ── */
const ROOMS: Room[] = [
  { title: "Community Health Q&A",    host: "Dr. Tendai M.",  category: "health",       status: "live", participants: 34, lang: "English / Shona"   },
  { title: "Small-Scale Farming Tips",host: "Farai Choto",    category: "agriculture",  status: "soon", participants: 12, lang: "Shona"             },
  { title: "Digital Rights Workshop", host: "Nomsa Dube",     category: "education",    status: "live", participants: 58, lang: "English"           },
  { title: "Morning News Roundup",    host: "ZBC Community",  category: "news",         status: "soon", participants: 7,  lang: "English / Ndebele" },
  { title: "Soil Health & Irrigation",host: "AgriConnect ZW", category: "agriculture",  status: "live", participants: 21, lang: "Shona / English"  },
  { title: "Mental Health Open Circle",host: "Wellness Hub",  category: "health",       status: "soon", participants: 15, lang: "English"           },
];

const FEATURES = [
  { tag: "Any device",    title: "Feature phone access",    desc: "Works via USSD on basic handsets. No smartphone, no app store, no data plan required. If you can make a call, you can use Dare.", color: "#D97706", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> },
  { tag: "Low bandwidth", title: "Adaptive audio",          desc: "Audio quality scales to your connection. Optimised for minimum data use — fully intelligible even on 2G networks.",               color: "#059669", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
  { tag: "Moderation",    title: "Room moderation",         desc: "Hosts control who speaks, set chat etiquette rules, mute participants, and manage the room queue — keeping sessions focused.",       color: "#7C3AED", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
  { tag: "Multilingual",  title: "Local languages first",   desc: "Host and listen in your own language. Prioritising local languages with a roadmap to support 20+ languages globally.",              color: "#3B82F6", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
  { tag: "Payments",      title: "Mobile money native",     desc: "Pay creators via local mobile money. No bank account required. ~85% of every payment goes directly to the creator.",              color: "#D97706", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
  { tag: "Ethics",        title: "Creator sovereignty",     desc: "Creators own their audience data. No algorithmic manipulation, no shadow banning. What you build is yours to keep.",               color: "#EF4444", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
  { tag: "Resilience",    title: "Offline-resilient",       desc: "Sessions buffer automatically. Listen when your signal returns — no rejoining, no missed content.",                                  color: "#059669", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> },
];

const BW_DATA = [
  { usage: 18, quality: 55,  label: "~18 KB/min • Compressed voice, fully intelligible" },
  { usage: 32, quality: 72,  label: "~32 KB/min • Standard voice quality"               },
  { usage: 56, quality: 88,  label: "~56 KB/min • Enhanced clarity"                     },
  { usage: 96, quality: 100, label: "~96 KB/min • Maximum quality"                      },
];

const STEPS = [
  { n: "01", t: "Register",         d: "Phone number only." },
  { n: "02", t: "Find a room",      d: "Browse by topic and language." },
  { n: "03", t: "Join & listen",    d: "Any device, any speed." },
  { n: "04", t: "Support creators", d: "Pay via mobile money." },
];

export default function Home() {
  const router = useRouter();

  const [activeStep, setActiveStep] = useState(0);
  const [featCur,    setFeatCur]    = useState(0);
  const [bwVal,      setBwVal]      = useState(2);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [filter,     setFilter]     = useState("all");
  const [joined,     setJoined]     = useState<Record<number, boolean>>({});
  const [reminded,   setReminded]   = useState<Record<number, boolean>>({});

  useEffect(() => {
    const t = setInterval(() => setFeatCur(c => (c + 1) % FEATURES.length), 4200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  const filteredRooms = filter === "all" ? ROOMS : ROOMS.filter(r => r.category === filter);

  const sec:    React.CSSProperties = { background: "var(--bg)",  borderBottom: "1px solid var(--divider)", padding: "3.5rem 2rem", transition: "background 0.3s" };
  const secAlt: React.CSSProperties = { background: "var(--bg2)", borderBottom: "1px solid var(--divider)", padding: "3.5rem 2rem", transition: "background 0.3s" };
  const inner:  React.CSSProperties = { maxWidth: 760, margin: "0 auto" };
  const lbl:    React.CSSProperties = { color: "#D97706", fontSize: "0.67rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.4rem", fontFamily: "sans-serif" };
  const h2:     React.CSSProperties = { fontSize: "clamp(1.3rem,2.8vw,1.9rem)", fontWeight: 700, color: "var(--text)", marginBottom: "1rem", lineHeight: 1.2, transition: "color 0.3s" };
  const body:   React.CSSProperties = { fontSize: "0.86rem", color: "var(--text2)", lineHeight: 1.75, fontFamily: "sans-serif" };
  const btnP:   React.CSSProperties = { background: "#D97706", color: "#fff", padding: "9px 22px", borderRadius: 5, border: "none", fontSize: "0.86rem", fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif", transition: "background 0.2s" };
  const btnG:   React.CSSProperties = { background: "transparent", color: "var(--text2)", padding: "8px 16px", borderRadius: 5, border: "0.5px solid var(--border2)", fontSize: "0.86rem", cursor: "pointer", fontFamily: "sans-serif" };

  return (
    <>
      {/* ── NAV ── */}
      <nav style={{ background: "var(--bg)", borderBottom: "1px solid var(--divider)", padding: "0.9rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50, transition: "background 0.3s" }}>
        <div style={{ cursor: "pointer" }} onClick={() => router.push("/")}>
          <div style={{ color: "#D97706", fontSize: "1rem", fontWeight: 700, lineHeight: 1.1 }}>DARE</div>
          <div style={{ color: "var(--text3)", fontSize: "0.68rem", fontFamily: "sans-serif" }}>The Digital Council</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ThemeToggle />
          <button style={btnG} onClick={() => router.push("/signin")}>Sign in</button>
          <button style={btnP} onClick={() => router.push("/register")}>Get started</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ ...sec, padding: "3.5rem 2rem 4rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(217,119,6,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={inner}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(217,119,6,0.1)", border: "0.5px solid rgba(217,119,6,0.3)", borderRadius: 100, padding: "3px 12px", marginBottom: "1.25rem" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D97706", display: "inline-block" }} />
            <span style={{ color: "#D97706", fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "sans-serif" }}>Prototype · Grant Application Stage</span>
          </div>
          <h1 style={{ color: "var(--text)", fontSize: "clamp(1.8rem,4.5vw,3rem)", lineHeight: 1.12, fontWeight: 700, marginBottom: "0.9rem", maxWidth: 600, transition: "color 0.3s" }}>
            Voice for everyone,<br />
            <span style={{ color: "#D97706" }}>on any connection.</span>
          </h1>
          <p style={{ ...body, maxWidth: 500, marginBottom: "1.75rem" }}>
            Dare is a digital-inclusive voice platform built for users with limited bandwidth, basic devices, and mobile-first access. No barriers. No compromises.
          </p>

          {/* CTA row */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1.5rem", maxWidth: 760 }}>
            <button style={btnP} onClick={() => router.push("/demo")}>Try the demo →</button>

            {/* Shona etymology */}
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", maxWidth: "clamp(200px, 35vw, 300px)", borderLeft: "2px solid rgba(217,119,6,0.5)", paddingLeft: "0.9rem" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", border: "1.5px solid rgba(217,119,6,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginBottom: "0.3rem", flexWrap: "wrap" }}>
                  <span style={{ color: "#D97706", fontSize: "clamp(0.85rem,1.8vw,0.95rem)", fontWeight: 700, fontFamily: "Georgia, serif", letterSpacing: "0.03em" }}>dare</span>
                  <span style={{ color: "#737373", fontSize: "0.68rem", fontFamily: "sans-serif", fontStyle: "italic" }}>/daː.ɾe/ · Shona</span>
                </div>
                <p style={{ color: "#a3a3a3", fontSize: "clamp(0.7rem,1.4vw,0.76rem)", lineHeight: 1.7, fontFamily: "sans-serif", margin: "0 0 0.35rem" }}>
                  A traditional gathering of community elders — to deliberate, resolve, and speak in council.
                </p>
                <p style={{ color: "rgba(217,119,6,0.65)", fontSize: "0.67rem", fontFamily: "sans-serif", fontStyle: "italic", margin: 0 }}>
                  "Every voice deserves a seat at the dare."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={sec}>
        <div style={inner}>
          <p style={lbl}>How it works</p>
          <h2 style={h2}>Four steps to your first session</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: "1.25rem", marginBottom: "1.25rem" }}>
            {STEPS.map((s, i) => (
              <div key={i} onClick={() => setActiveStep(i)} style={{ borderTop: `2px solid ${activeStep === i ? "#D97706" : "var(--border)"}`, paddingTop: "0.9rem", cursor: "pointer", transition: "border-color 0.2s" }}>
                <div style={{ color: "#D97706", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "0.4rem", fontFamily: "sans-serif" }}>{s.n}</div>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: "0.3rem", color: "var(--text)", fontFamily: "sans-serif" }}>{s.t}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text2)", lineHeight: 1.55, fontFamily: "sans-serif" }}>{s.d}</div>
              </div>
            ))}
          </div>

          {/* Feature carousel */}
          <div style={{ background: "var(--bg2)", borderRadius: "0 10px 10px 0", borderLeft: "3px solid #D97706", overflow: "hidden" }}>
            <div style={{ overflow: "hidden" }}>
              <div style={{ display: "flex", transform: `translateX(-${featCur * 100}%)`, transition: "transform 0.42s cubic-bezier(.4,0,.2,1)" }}>
                {FEATURES.map((f, i) => (
                  <div key={i} style={{ minWidth: "100%", padding: "1.25rem 1.5rem", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${f.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, border: `0.5px solid ${f.color}30` }}>
                      {f.icon}
                    </div>
                    <div>
                      <span style={{ fontSize: "0.63rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 100, display: "inline-block", marginBottom: "0.35rem", background: "var(--bg)", color: "var(--text2)", border: "0.5px solid var(--border2)", fontFamily: "sans-serif" }}>{f.tag}</span>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.3rem" }}>{f.title}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text2)", lineHeight: 1.65, fontFamily: "sans-serif" }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, padding: "0.75rem 1.5rem" }}>
              {FEATURES.map((_, i) => (
                <button key={i} onClick={() => setFeatCur(i)} style={{ width: featCur === i ? 18 : 7, height: 7, borderRadius: featCur === i ? 3 : "50%", background: featCur === i ? "#D97706" : "var(--dot)", border: "none", cursor: "pointer", padding: 0, transition: "background 0.2s, width 0.25s" }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── BANDWIDTH DEMO ── */}
      <section style={secAlt}>
        <div style={inner}>
          <p style={lbl}>Inclusive by design</p>
          <h2 style={h2}>Built for low-bandwidth users</h2>
          <p style={{ ...body, maxWidth: 500 }}>Dare adapts to your connection automatically. Move the slider to see how audio quality scales while keeping data use minimal.</p>
          <div style={{ background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "1.25rem", marginTop: "1.25rem" }}>
            <div style={{ fontSize: "0.73rem", color: "var(--text2)", marginBottom: "0.3rem", fontFamily: "sans-serif" }}>Your connection speed</div>
            <input type="range" min={1} max={4} step={1} value={bwVal} onChange={e => setBwVal(Number(e.target.value))} style={{ width: "100%", marginBottom: "0.5rem" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.62rem", color: "var(--text3)", marginBottom: "1rem", fontFamily: "sans-serif" }}>
              <span>EDGE / 2G</span><span>3G</span><span>4G</span><span>WiFi</span>
            </div>
            {[
              { label: "Data usage per minute", val: BW_DATA[bwVal-1].usage,   color: "#D97706", max: 96  },
              { label: "Audio clarity",          val: BW_DATA[bwVal-1].quality, color: "#059669", max: 100 },
            ].map(bar => (
              <div key={bar.label}>
                <div style={{ fontSize: "0.73rem", color: "var(--text2)", marginBottom: "0.3rem", fontFamily: "sans-serif" }}>{bar.label}</div>
                <div style={{ background: "var(--bg2)", borderRadius: 100, height: 6, marginBottom: "0.9rem", overflow: "hidden" }}>
                  <div style={{ width: `${Math.round((bar.val / bar.max) * 100)}%`, height: "100%", borderRadius: 100, background: bar.color, transition: "width 0.45s ease" }} />
                </div>
              </div>
            ))}
            <div style={{ fontSize: "0.83rem", fontWeight: 600, color: "var(--text)", marginTop: "0.5rem", fontFamily: "sans-serif" }}>{BW_DATA[bwVal-1].label}</div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "var(--bg)", borderTop: "1px solid var(--divider)", padding: "2.25rem 2rem 1.5rem" }}>
        <div style={inner}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: "1.25rem", marginBottom: "1.5rem" }}>
            <div>
              <div style={{ color: "#D97706", fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.15rem" }}>DARE</div>
              <div style={{ color: "var(--text3)", fontSize: "0.7rem", fontFamily: "sans-serif", marginBottom: "0.4rem" }}>The Digital Council</div>
              <p style={{ color: "var(--text3)", fontSize: "0.72rem", fontFamily: "sans-serif", lineHeight: 1.6 }}>Inclusive voice for everyone, on any connection.</p>
            </div>
            {[
              { h: "Product", links: [{ l: "Browse rooms", fn: () => router.push("/rooms") }, { l: "Feature phone (*447#)", fn: () => router.push("/ussd") }, { l: "Impact metrics", fn: () => router.push("/analytics") }, { l: "Demo accounts", fn: () => router.push("/demo") }, { l: "Get started", fn: () => router.push("/register") }, { l: "Sign in", fn: () => router.push("/signin") }] },
              { h: "Company", links: [{ l: "About", fn: () => {} }, { l: "Contact", fn: () => {} }] },
              { h: "Legal",   links: [{ l: "Privacy policy", fn: () => {} }, { l: "Terms of service", fn: () => {} }] },
            ].map(col => (
              <div key={col.h}>
                <div style={{ color: "var(--text2)", fontSize: "0.68rem", fontWeight: 700, marginBottom: "0.6rem", letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "sans-serif" }}>{col.h}</div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {col.links.map(lk => (
                    <li key={lk.l} style={{ marginBottom: "0.4rem" }}>
                      <button onClick={lk.fn} style={{ background: "none", border: "none", color: "var(--text3)", fontSize: "0.76rem", fontFamily: "sans-serif", cursor: "pointer", padding: 0 }}>{lk.l}</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "0.5px solid var(--divider)", paddingTop: "1.1rem" }}>
            <p style={{ color: "var(--text3)", fontSize: "0.63rem", fontFamily: "sans-serif", lineHeight: 1.7, marginBottom: "0.3rem" }}>
              © {new Date().getFullYear()} Dare — The Digital Council. Prototype built for grant evaluation. Figures are projections and do not constitute guaranteed commercial outcomes.
            </p>
            <p style={{ color: "var(--text3)", fontSize: "0.63rem", fontFamily: "sans-serif", lineHeight: 1.7 }}>
              Operates in compliance with applicable telecommunications and data protection regulations. Zimbabwe enquiries: compliance@dare.zw
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
