"use client";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

const rooms = [
  { title: "Community Health Q&A", host: "Dr. Tendai M.", category: "health", status: "live", participants: 34, lang: "English / Shona" },
  { title: "Small-Scale Farming Tips", host: "Farai Choto", category: "agriculture", status: "soon", participants: 12, lang: "Shona" },
  { title: "Digital Rights Workshop", host: "Nomsa Dube", category: "education", status: "live", participants: 58, lang: "English" },
  { title: "Morning News Roundup", host: "ZBC Community", category: "news", status: "soon", participants: 7, lang: "English / Ndebele" },
  { title: "Soil Health & Irrigation", host: "AgriConnect ZW", category: "agriculture", status: "live", participants: 21, lang: "Shona / English" },
  { title: "Mental Health Open Circle", host: "Wellness Hub", category: "health", status: "soon", participants: 15, lang: "English" },
];

const features = [
  { tag: "Any device",    title: "Feature phone access",  desc: "Works via USSD on basic handsets. No smartphone, no app store, no data plan required. If you can make a call, you can use Dare.", color: "#D97706" },
  { tag: "Low bandwidth", title: "Adaptive audio",        desc: "Audio quality scales to your connection. Optimised for minimum data use — fully intelligible even on 2G networks.", color: "#059669" },
  { tag: "Moderation",    title: "Room moderation",       desc: "Hosts control who speaks, set chat etiquette rules, mute participants, and manage the room queue — keeping sessions focused and respectful.", color: "#7C3AED" },
  { tag: "Multilingual",  title: "Local languages first", desc: "Host and listen in your own language. Prioritising local languages with a roadmap to support 20+ languages globally.", color: "#3B82F6" },
  { tag: "Payments",      title: "Mobile money native",   desc: "Pay creators via local mobile money. No bank account required. ~85% of every payment goes directly to the creator.", color: "#D97706" },
  { tag: "Ethics",        title: "Creator sovereignty",   desc: "Creators own their audience data. No algorithmic manipulation, no shadow banning. What you build is yours to keep.", color: "#EF4444" },
  { tag: "Resilience",    title: "Offline-resilient",     desc: "Sessions buffer automatically. Listen when your signal returns — no rejoining, no missed content.", color: "#059669" },
];

const bwData = [
  { usage: 18, quality: 55,  label: "~18 KB/min • Compressed voice, fully intelligible" },
  { usage: 32, quality: 72,  label: "~32 KB/min • Standard voice quality" },
  { usage: 56, quality: 88,  label: "~56 KB/min • Enhanced clarity" },
  { usage: 96, quality: 100, label: "~96 KB/min • Maximum quality" },
];

const steps = [
  { n: "01", t: "Register",         d: "Phone number only." },
  { n: "02", t: "Find a room",      d: "Browse by topic and language." },
  { n: "03", t: "Join & listen",    d: "Any device, any speed." },
  { n: "04", t: "Support creators", d: "Pay via mobile money." },
];

export default function Home() {
  const [activeStep, setActiveStep] = useState(0);
  const [featCur,    setFeatCur]    = useState(0);
  const [bwVal,      setBwVal]      = useState(2);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [filter,     setFilter]     = useState("all");
  const [joined,     setJoined]     = useState<Record<number, boolean>>({});
  const [reminded,   setReminded]   = useState<Record<number, boolean>>({});

  useEffect(() => {
    const t = setInterval(() => setFeatCur(c => (c + 1) % features.length), 4200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  const filteredRooms = filter === "all" ? rooms : rooms.filter(r => r.category === filter);

  const section:    React.CSSProperties = { background: "var(--bg)",  borderBottom: "1px solid var(--divider)", padding: "3.5rem 2rem", transition: "background 0.3s, border-color 0.3s" };
  const sectionAlt: React.CSSProperties = { background: "var(--bg2)", borderBottom: "1px solid var(--divider)", padding: "3.5rem 2rem", transition: "background 0.3s, border-color 0.3s" };
  const inner:      React.CSSProperties = { maxWidth: 760, margin: "0 auto" };
  const label:      React.CSSProperties = { color: "#D97706", fontSize: "0.67rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.4rem", fontFamily: "sans-serif" };
  const h2:         React.CSSProperties = { fontSize: "clamp(1.3rem,2.8vw,1.9rem)", fontWeight: 700, color: "var(--text)", marginBottom: "1rem", lineHeight: 1.2, transition: "color 0.3s" };
  const body:       React.CSSProperties = { fontSize: "0.86rem", color: "var(--text2)", lineHeight: 1.75, fontFamily: "sans-serif", transition: "color 0.3s" };
  const btnPrimary: React.CSSProperties = { background: "#D97706", color: "#fff", padding: "9px 22px", borderRadius: 5, border: "none", fontSize: "0.86rem", fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif", transition: "background 0.2s" };

  return (
    <>
      {/* NAV */}
      <nav style={{ background: "var(--bg)", borderBottom: "1px solid var(--divider)", padding: "0.9rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50, transition: "background 0.3s, border-color 0.3s" }}>
        <div>
          <div style={{ color: "#D97706", fontSize: "1rem", fontWeight: 700, lineHeight: 1.1 }}>DARE</div>
          <div style={{ color: "var(--text3)", fontSize: "0.68rem", fontFamily: "sans-serif", transition: "color 0.3s" }}>The Digital Council</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <ThemeToggle />
          <button style={btnPrimary} onClick={() => setModalOpen(true)}>Get started</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ ...section, padding: "3.5rem 2rem 4rem", position: "relative", overflow: "hidden" }}>
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
          <button style={btnPrimary} onClick={() => setModalOpen(true)}>Try the demo →</button>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={section}>
        <div style={inner}>
          <p style={label}>How it works</p>
          <h2 style={h2}>Four steps to your first session</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: "1.25rem", marginBottom: "1.25rem" }}>
            {steps.map((s, i) => (
              <div key={i} onClick={() => setActiveStep(i)} style={{ borderTop: `2px solid ${activeStep === i ? "#D97706" : "var(--border)"}`, paddingTop: "0.9rem", cursor: "pointer", transition: "border-color 0.2s" }}>
                <div style={{ color: "#D97706", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "0.4rem", fontFamily: "sans-serif" }}>{s.n}</div>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: "0.3rem", color: "var(--text)", fontFamily: "sans-serif", transition: "color 0.3s" }}>{s.t}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text2)", lineHeight: 1.55, fontFamily: "sans-serif", transition: "color 0.3s" }}>{s.d}</div>
              </div>
            ))}
          </div>

          {/* Feature carousel */}
          <div style={{ background: "var(--bg2)", borderRadius: "0 10px 10px 0", borderLeft: "3px solid #D97706", overflow: "hidden", transition: "background 0.3s" }}>
            <div style={{ overflow: "hidden" }}>
              <div style={{ display: "flex", transform: `translateX(-${featCur * 100}%)`, transition: "transform 0.42s cubic-bezier(.4,0,.2,1)" }}>
                {features.map((f, i) => (
                  <div key={i} style={{ minWidth: "100%", padding: "1.1rem 1.4rem", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: `${f.color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: f.color }} />
                    </div>
                    <div>
                      <span style={{ fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 100, display: "inline-block", marginBottom: "0.32rem", background: "var(--bg)", color: "var(--text2)", border: "0.5px solid var(--border2)", fontFamily: "sans-serif", transition: "background 0.3s, color 0.3s" }}>{f.tag}</span>
                      <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.28rem", transition: "color 0.3s" }}>{f.title}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text2)", lineHeight: 1.6, fontFamily: "sans-serif", transition: "color 0.3s" }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, padding: "0.75rem 1.4rem", alignItems: "center" }}>
              {features.map((_, i) => (
                <button key={i} onClick={() => setFeatCur(i)} style={{ width: featCur === i ? 18 : 7, height: 7, borderRadius: featCur === i ? 3 : "50%", background: featCur === i ? "#D97706" : "var(--dot)", border: "none", cursor: "pointer", padding: 0, transition: "background 0.2s, width 0.25s" }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BANDWIDTH DEMO */}
      <section style={sectionAlt}>
        <div style={inner}>
          <p style={label}>Inclusive by design</p>
          <h2 style={h2}>Built for low-bandwidth users</h2>
          <p style={{ ...body, maxWidth: 500 }}>Dare adapts to your connection automatically. Move the slider to see how audio quality scales while keeping data use minimal.</p>
          <div style={{ background: "var(--bg)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "1.25rem", marginTop: "1.25rem", transition: "background 0.3s, border-color 0.3s" }}>
            <div style={{ fontSize: "0.73rem", color: "var(--text2)", marginBottom: "0.3rem", fontFamily: "sans-serif" }}>Your connection speed</div>
            <input type="range" min={1} max={4} step={1} value={bwVal} onChange={e => setBwVal(Number(e.target.value))} style={{ width: "100%", marginBottom: "0.5rem" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.62rem", color: "var(--text3)", marginBottom: "1rem", fontFamily: "sans-serif" }}>
              <span>EDGE / 2G</span><span>3G</span><span>4G</span><span>WiFi</span>
            </div>
            {[
              { label: "Data usage per minute", val: bwData[bwVal-1].usage,   color: "#D97706", max: 96  },
              { label: "Audio clarity",          val: bwData[bwVal-1].quality, color: "#059669", max: 100 },
            ].map(bar => (
              <div key={bar.label}>
                <div style={{ fontSize: "0.73rem", color: "var(--text2)", marginBottom: "0.3rem", fontFamily: "sans-serif" }}>{bar.label}</div>
                <div style={{ background: "var(--bg2)", borderRadius: 100, height: 6, marginBottom: "0.9rem", overflow: "hidden" }}>
                  <div style={{ width: `${Math.round((bar.val / bar.max) * 100)}%`, height: "100%", borderRadius: 100, background: bar.color, transition: "width 0.45s ease" }} />
                </div>
              </div>
            ))}
            <div style={{ fontSize: "0.83rem", fontWeight: 600, color: "var(--text)", marginTop: "0.5rem", fontFamily: "sans-serif", transition: "color 0.3s" }}>{bwData[bwVal-1].label}</div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "var(--bg)", borderTop: "1px solid var(--divider)", padding: "2.25rem 2rem 1.5rem", transition: "background 0.3s, border-color 0.3s" }}>
        <div style={inner}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: "1.25rem", marginBottom: "1.5rem" }}>
            <div>
              <div style={{ color: "#D97706", fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.15rem" }}>DARE</div>
              <div style={{ color: "var(--text3)", fontSize: "0.7rem", fontFamily: "sans-serif", marginBottom: "0.4rem", transition: "color 0.3s" }}>The Digital Council</div>
              <p style={{ color: "var(--text3)", fontSize: "0.72rem", fontFamily: "sans-serif", lineHeight: 1.6, transition: "color 0.3s" }}>Inclusive voice for everyone, on any connection.</p>
            </div>
            {[
              { h: "Product", links: [{ l: "Browse rooms", fn: () => setModalOpen(true) }, { l: "Get started", fn: () => setModalOpen(true) }] },
              { h: "Company", links: [{ l: "About", fn: () => {} }, { l: "Contact", fn: () => {} }] },
              { h: "Legal",   links: [{ l: "Privacy policy", fn: () => {} }, { l: "Terms of service", fn: () => {} }] },
            ].map(col => (
              <div key={col.h}>
                <div style={{ color: "var(--text2)", fontSize: "0.68rem", fontWeight: 700, marginBottom: "0.6rem", letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "sans-serif", transition: "color 0.3s" }}>{col.h}</div>
                <ul style={{ listStyle: "none" }}>
                  {col.links.map(lk => (
                    <li key={lk.l} style={{ marginBottom: "0.4rem" }}>
                      <button onClick={lk.fn} style={{ background: "none", border: "none", color: "var(--text3)", fontSize: "0.76rem", fontFamily: "sans-serif", cursor: "pointer", padding: 0, transition: "color 0.2s" }}>{lk.l}</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "0.5px solid var(--divider)", paddingTop: "1.1rem" }}>
            <p style={{ color: "var(--text3)", fontSize: "0.63rem", fontFamily: "sans-serif", lineHeight: 1.7, marginBottom: "0.3rem", transition: "color 0.3s" }}>
              © {new Date().getFullYear()} Dare — The Digital Council. Prototype built for grant evaluation. Revenue share and data savings figures are projections from prototype testing and do not constitute guaranteed commercial outcomes.
            </p>
            <p style={{ color: "var(--text3)", fontSize: "0.63rem", fontFamily: "sans-serif", lineHeight: 1.7, transition: "color 0.3s" }}>
              Operates in compliance with applicable telecommunications and data protection regulations. Zimbabwe enquiries: compliance@dare.zw
            </p>
          </div>
        </div>
      </footer>

      {/* ROOMS MODAL */}
      {modalOpen && (
        <div id="overlay" onClick={e => { if ((e.target as HTMLElement).id === "overlay") setModalOpen(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "var(--bg)", borderRadius: 12, border: "0.5px solid var(--border)", width: "100%", maxWidth: 460, maxHeight: "78vh", overflowY: "auto", transition: "background 0.3s" }}>
            <div style={{ padding: "1.1rem 1.4rem", borderBottom: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif" }}>Browse rooms</span>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--text2)", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: "flex", gap: 6, padding: "0.9rem 1.4rem", flexWrap: "wrap", borderBottom: "0.5px solid var(--border)" }}>
              {["all", "health", "agriculture", "education", "news"].map(cat => (
                <button key={cat} onClick={() => setFilter(cat)} style={{ background: filter === cat ? "rgba(217,119,6,0.12)" : "var(--bg2)", border: `0.5px solid ${filter === cat ? "#D97706" : "var(--border)"}`, borderRadius: 100, padding: "4px 12px", fontSize: "0.72rem", cursor: "pointer", fontFamily: "sans-serif", color: filter === cat ? "#D97706" : "var(--text2)", textTransform: "capitalize", transition: "all 0.15s" }}>
                  {cat}
                </button>
              ))}
            </div>
            <div style={{ padding: "0.75rem 1.4rem" }}>
              {filteredRooms.map((r, i) => (
                <div key={i} style={{ border: "0.5px solid var(--border)", borderRadius: 8, padding: "0.9rem", marginBottom: "0.65rem", background: "var(--bg)", transition: "background 0.3s, border-color 0.3s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.35rem", gap: "0.5rem" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif" }}>{r.title}</div>
                    <span style={{ background: r.status === "live" ? "rgba(5,150,105,0.12)" : "rgba(217,119,6,0.12)", color: r.status === "live" ? "#059669" : "#D97706", fontSize: "0.62rem", fontWeight: 600, padding: "2px 7px", borderRadius: 100, whiteSpace: "nowrap", flexShrink: 0, border: `0.5px solid ${r.status === "live" ? "rgba(5,150,105,0.3)" : "rgba(217,119,6,0.3)"}`, fontFamily: "sans-serif" }}>
                      {r.status === "live" ? "Live now" : "Starting soon"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.73rem", color: "var(--text2)", fontFamily: "sans-serif", lineHeight: 1.5, marginBottom: "0.55rem" }}>
                    Host: {r.host} · {r.lang} · {r.participants} listeners
                  </div>
                  {r.status === "live" ? (
                    <button onClick={() => setJoined(j => ({ ...j, [i]: true }))} disabled={joined[i]} style={{ background: joined[i] ? "#059669" : "#D97706", color: "#fff", border: "none", borderRadius: 4, padding: "5px 14px", fontSize: "0.73rem", fontWeight: 600, cursor: joined[i] ? "default" : "pointer", fontFamily: "sans-serif", transition: "background 0.3s" }}>
                      {joined[i] ? "Joined ✓" : "Join room"}
                    </button>
                  ) : (
                    <button onClick={() => setReminded(r => ({ ...r, [i]: true }))} disabled={reminded[i]} style={{ background: "transparent", color: reminded[i] ? "#D97706" : "var(--text2)", border: `0.5px solid ${reminded[i] ? "#D97706" : "var(--border2)"}`, borderRadius: 4, padding: "5px 14px", fontSize: "0.73rem", cursor: reminded[i] ? "default" : "pointer", fontFamily: "sans-serif", transition: "color 0.2s, border-color 0.2s" }}>
                      {reminded[i] ? "Reminder set ✓" : "Remind me"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
