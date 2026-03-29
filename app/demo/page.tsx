"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ThemeToggle";

/*
  Demo login uses the same phone-as-email workaround as register:
  phone number → [digits]@dare.prototype
  This is a prototype convention — production will use real SMS OTP via Twilio.
*/

const DEMO_USERS = [
  { name: "Dr. Tendai Moyo",  role: "Host — Health",        phone: "+263771111001", color: "#D97706", desc: "Community health worker in Harare" },
  { name: "Farai Choto",      role: "Host — Agriculture",   phone: "+263771111002", color: "#059669", desc: "Small-scale farmer in Masvingo" },
  { name: "Nomsa Dube",       role: "Host — Education",     phone: "+263771111003", color: "#3B82F6", desc: "Digital rights advocate" },
  { name: "Tatenda Ncube",    role: "Host — News",          phone: "+263771111004", color: "#7C3AED", desc: "Independent journalist" },
  { name: "Rudo Zimba",       role: "Host — Mental Health", phone: "+263771111005", color: "#EC4899", desc: "Mental health counsellor, Bulawayo" },
  { name: "Chiedza Mutasa",   role: "Listener",             phone: "+263771111006", color: "#0891B2", desc: "University student" },
  { name: "Blessing Phiri",   role: "Listener",             phone: "+263771111007", color: "#65A30D", desc: "Retired teacher from Gweru" },
  { name: "Simba Chikowore",  role: "Listener",             phone: "+263771111008", color: "#EF4444", desc: "Youth entrepreneur" },
  { name: "Grace Thompson",    role: "Host — Travel",        phone: "+263771111009", color: "#0891B2", desc: "Travel writer, Victoria Falls" },
];

const INITIALS = (name: string) =>
  name.trim().split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2);

const phoneToEmail = (phone: string) =>
  `${phone.replace(/\D/g, "")}@dare.prototype`;

export default function DemoPage() {
  const router = useRouter();
  const [loggingIn, setLoggingIn] = useState<string | null>(null);
  const [error,     setError]     = useState("");

  const loginAs = async (phone: string, name: string) => {
    setLoggingIn(phone);
    setError("");
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email:    phoneToEmail(phone),
        password: "DareDemo2026!",
      });
      if (signInError) throw signInError;
      router.push("/rooms");
    } catch {
      setError(`Could not sign in as ${name}. Make sure you have run the seed SQL first.`);
      setLoggingIn(null);
    }
  };

  return (
    <>
      <nav style={{ background: "var(--bg)", borderBottom: "1px solid var(--divider)", padding: "0.9rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ cursor: "pointer" }} onClick={() => router.push("/")}>
          <div style={{ color: "#D97706", fontSize: "1rem", fontWeight: 700, lineHeight: 1.1 }}>DARE</div>
          <div style={{ color: "var(--text3)", fontSize: "0.68rem", fontFamily: "sans-serif" }}>The Digital Council</div>
        </div>
        <ThemeToggle />
      </nav>

      <div style={{ background: "var(--bg)", minHeight: "calc(100vh - 60px)", transition: "background 0.3s" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "2.5rem 1.5rem 5rem" }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(217,119,6,0.1)", border: "0.5px solid rgba(217,119,6,0.3)", borderRadius: 100, padding: "3px 14px", marginBottom: "1rem" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D97706", display: "inline-block" }} />
              <span style={{ color: "#D97706", fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "sans-serif" }}>Grant Reviewer Access</span>
            </div>
            <h1 style={{ fontSize: "clamp(1.4rem,3vw,1.9rem)", fontWeight: 700, color: "var(--text)", marginBottom: "0.5rem" }}>
              Demo accounts
            </h1>
            <p style={{ fontSize: "0.88rem", color: "var(--text2)", lineHeight: 1.7, fontFamily: "sans-serif", maxWidth: 480, margin: "0 auto" }}>
              Sign in as any community member to explore the full Dare experience. Each account represents a real user persona from Zimbabwe.
            </p>
          </div>

          {/* Prototype auth note */}
          <div style={{ background: "rgba(217,119,6,0.06)", border: "0.5px solid rgba(217,119,6,0.2)", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1.5rem", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p style={{ fontSize: "0.78rem", color: "var(--text2)", fontFamily: "sans-serif", lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: "var(--text)" }}>Prototype note:</strong> In production, users authenticate via SMS OTP sent to their phone number — no email or internet browser required. Feature phone users dial <strong style={{ color: "#D97706" }}>*447#</strong> via USSD. This demo uses a phone-number-to-email mapping as a prototype workaround.
            </p>
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "0.82rem", color: "#EF4444", fontFamily: "sans-serif", margin: 0 }}>{error}</p>
            </div>
          )}

          {/* User grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.9rem", marginBottom: "2rem" }}>
            {DEMO_USERS.map(u => {
              const isActive = loggingIn === u.phone;
              return (
                <button
                  key={u.phone}
                  onClick={() => loginAs(u.phone, u.name)}
                  disabled={loggingIn !== null}
                  style={{
                    background: "var(--bg)",
                    border: `0.5px solid ${isActive ? u.color : "var(--border)"}`,
                    borderRadius: 10, padding: "1rem", cursor: loggingIn ? "default" : "pointer",
                    display: "flex", alignItems: "center", gap: "0.9rem",
                    transition: "border-color 0.2s, opacity 0.2s",
                    opacity: loggingIn && !isActive ? 0.45 : 1,
                    textAlign: "left" as const,
                  }}
                  onMouseEnter={e => { if (!loggingIn) (e.currentTarget as HTMLButtonElement).style.borderColor = u.color; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; }}
                >
                  {/* Avatar */}
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: u.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", fontWeight: 700, color: "#fff", fontFamily: "sans-serif", flexShrink: 0 }}>
                    {isActive ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
                        <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                        <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
                      </svg>
                    ) : INITIALS(u.name)}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif", marginBottom: 3 }}>{u.name}</div>
                    <div style={{ marginBottom: 3 }}>
                      <span style={{
                        background: u.role.startsWith("Host") ? "rgba(217,119,6,0.1)" : "var(--bg2)",
                        color: u.role.startsWith("Host") ? "#D97706" : "var(--text3)",
                        border: `0.5px solid ${u.role.startsWith("Host") ? "rgba(217,119,6,0.3)" : "var(--border)"}`,
                        borderRadius: 100, padding: "1px 7px", fontSize: "0.68rem",
                        fontWeight: 600, fontFamily: "sans-serif",
                      }}>{u.role}</span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{u.desc}</div>
                  </div>

                  {!isActive && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Instructions */}
          <div style={{ background: "var(--bg2)", borderRadius: 10, border: "0.5px solid var(--border)", padding: "1.25rem 1.5rem" }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", fontFamily: "sans-serif", marginBottom: "0.75rem" }}>How to explore this demo</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[
                { step: "1", text: "Sign in as a host (e.g. Dr. Tendai Moyo) to see the creator dashboard, earnings, and start rooms." },
                { step: "2", text: "Sign in as a listener to join rooms, raise your hand to speak, tip creators, and follow people." },
                { step: "3", text: "Visit /rooms to see live and scheduled sessions across health, agriculture, education, and more." },
                { step: "4", text: "Visit /dashboard (as a host) to see wallet balance, tip breakdowns, follower growth, and session analytics." },
                { step: "5", text: "In production: feature phone users dial *447# and navigate via USSD — no smartphone or internet needed." },
              ].map(s => (
                <div key={s.step} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(217,119,6,0.12)", border: "0.5px solid rgba(217,119,6,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, color: "#D97706", fontFamily: "sans-serif", flexShrink: 0 }}>{s.step}</div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text2)", fontFamily: "sans-serif", lineHeight: 1.6, margin: 0 }}>{s.text}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "0.5px solid var(--border)" }}>
              <p style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif", margin: 0, lineHeight: 1.6 }}>
                All demo content represents real community needs in Zimbabwe — health, agriculture, education, digital rights, and mental health. Dare is built for the 1.4 billion people locked out of voice platforms by bandwidth and device barriers.
              </p>
            </div>
          </div>

        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
