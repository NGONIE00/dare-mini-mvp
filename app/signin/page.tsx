"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ThemeToggle";

const COUNTRIES = [
  { code: "ZW", dial: "+263", name: "Zimbabwe",       flag: "🇿🇼", digits: 9  },
  { code: "ZA", dial: "+27",  name: "South Africa",   flag: "🇿🇦", digits: 9  },
  { code: "ZM", dial: "+260", name: "Zambia",         flag: "🇿🇲", digits: 9  },
  { code: "MZ", dial: "+258", name: "Mozambique",     flag: "🇲🇿", digits: 9  },
  { code: "BW", dial: "+267", name: "Botswana",       flag: "🇧🇼", digits: 7  },
  { code: "NA", dial: "+264", name: "Namibia",        flag: "🇳🇦", digits: 9  },
  { code: "KE", dial: "+254", name: "Kenya",          flag: "🇰🇪", digits: 9  },
  { code: "TZ", dial: "+255", name: "Tanzania",       flag: "🇹🇿", digits: 9  },
  { code: "UG", dial: "+256", name: "Uganda",         flag: "🇺🇬", digits: 9  },
  { code: "ET", dial: "+251", name: "Ethiopia",       flag: "🇪🇹", digits: 9  },
  { code: "NG", dial: "+234", name: "Nigeria",        flag: "🇳🇬", digits: 10 },
  { code: "GH", dial: "+233", name: "Ghana",          flag: "🇬🇭", digits: 9  },
  { code: "SN", dial: "+221", name: "Senegal",        flag: "🇸🇳", digits: 9  },
  { code: "CI", dial: "+225", name: "Côte d'Ivoire",  flag: "🇨🇮", digits: 10 },
  { code: "CM", dial: "+237", name: "Cameroon",       flag: "🇨🇲", digits: 9  },
  { code: "RW", dial: "+250", name: "Rwanda",         flag: "🇷🇼", digits: 9  },
  { code: "MG", dial: "+261", name: "Madagascar",     flag: "🇲🇬", digits: 9  },
  { code: "MW", dial: "+265", name: "Malawi",         flag: "🇲🇼", digits: 9  },
  { code: "GB", dial: "+44",  name: "United Kingdom", flag: "🇬🇧", digits: 10 },
  { code: "US", dial: "+1",   name: "United States",  flag: "🇺🇸", digits: 10 },
  { code: "CA", dial: "+1",   name: "Canada",         flag: "🇨🇦", digits: 10 },
  { code: "AU", dial: "+61",  name: "Australia",      flag: "🇦🇺", digits: 9  },
  { code: "IN", dial: "+91",  name: "India",          flag: "🇮🇳", digits: 10 },
  { code: "DE", dial: "+49",  name: "Germany",        flag: "🇩🇪", digits: 11 },
  { code: "FR", dial: "+33",  name: "France",         flag: "🇫🇷", digits: 9  },
  { code: "BR", dial: "+55",  name: "Brazil",         flag: "🇧🇷", digits: 11 },
];

export default function SignIn() {
  const router = useRouter();

  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [countryOpen,     setCountryOpen]     = useState(false);
  const [countrySearch,   setCountrySearch]   = useState("");
  const [phone,           setPhone]           = useState("");
  const [error,           setError]           = useState("");
  const [loading,         setLoading]         = useState(false);
  const [success,         setSuccess]         = useState(false);

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.dial.includes(countrySearch)
  );

  const fullPhone = () => {
    const digits = phone.replace(/\D/g, "");
    return `${selectedCountry.dial}${digits}`;
  };

  const handleSignIn = async () => {
    const digits = phone.replace(/\D/g, "");
    if (!digits || digits.length < 5) { setError("Enter a valid phone number"); return; }

    setLoading(true); setError("");
    try {
      const fp = fullPhone();
      const allDigits = fp.replace(/\D/g, "");
      const fakeEmail = `${allDigits}@dare.app`;
      const password  = `Dare${allDigits}#Zw`;

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: fakeEmail, password,
      });

      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          setError("No account found for this number. Please register first.");
        } else {
          setError(signInError.message);
        }
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/rooms"), 1500);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  /* ── styles ── */
  const inp: React.CSSProperties = {
    background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 10,
    padding: "11px 14px", fontSize: "0.95rem", color: "var(--text)",
    fontFamily: "sans-serif", outline: "none", transition: "border-color 0.2s",
  };

  return (
    <>
      <nav style={{ background: "var(--bg)", borderBottom: "1px solid var(--divider)", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ cursor: "pointer" }} onClick={() => router.push("/")}>
          <div style={{ color: "#D97706", fontSize: "1rem", fontWeight: 700, lineHeight: 1.1 }}>DARE</div>
          <div style={{ color: "var(--text3)", fontSize: "0.65rem", fontFamily: "sans-serif" }}>The Digital Council</div>
        </div>
        <ThemeToggle />
      </nav>

      <div style={{ background: "var(--bg)", minHeight: "calc(100vh - 60px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", transition: "background 0.3s" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>

          {success ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(5,150,105,0.1)", border: "1.5px solid rgba(5,150,105,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text)", fontFamily: "sans-serif", marginBottom: "0.4rem" }}>Welcome back!</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text3)", fontFamily: "sans-serif" }}>Taking you to rooms...</p>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text)", marginBottom: "0.4rem", fontFamily: "sans-serif" }}>Sign in</h1>
              <p style={{ fontSize: "0.85rem", color: "var(--text2)", fontFamily: "sans-serif", lineHeight: 1.6, marginBottom: "2rem" }}>
                Enter the phone number you registered with.
              </p>

              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", fontFamily: "sans-serif", marginBottom: 5 }}>
                Phone number
              </label>

              {/* Country + number */}
              <div style={{ display: "flex", gap: 8, marginBottom: 8, position: "relative" }}>

                <button onClick={() => setCountryOpen(v => !v)} style={{
                  ...inp, display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                  minWidth: 90, cursor: "pointer", border: "1px solid var(--border2)",
                }}>
                  <span>{selectedCountry.flag}</span>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>{selectedCountry.dial}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </button>

                {countryOpen && (
                  <div style={{ position: "absolute", top: "100%", left: 0, width: 280, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", overflow: "hidden", marginTop: 4 }}>
                    <div style={{ padding: "0.6rem" }}>
                      <input autoFocus value={countrySearch} onChange={e => setCountrySearch(e.target.value)}
                        placeholder="Search country or code..."
                        style={{ ...inp, width: "100%", padding: "8px 12px", fontSize: "0.85rem", boxSizing: "border-box" as const }}
                      />
                    </div>
                    <div style={{ maxHeight: 220, overflowY: "auto" }}>
                      {filteredCountries.map(c => (
                        <button key={`${c.code}-${c.dial}`}
                          onClick={() => { setSelectedCountry(c); setCountryOpen(false); setCountrySearch(""); }}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const }}>
                          <span style={{ fontSize: "1.1rem" }}>{c.flag}</span>
                          <span style={{ flex: 1, fontSize: "0.85rem", color: "var(--text)", fontFamily: "sans-serif" }}>{c.name}</span>
                          <span style={{ fontSize: "0.8rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{c.dial}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <input type="tel" value={phone}
                  onChange={e => { setPhone(e.target.value.replace(/[^\d\s\-]/g, "")); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleSignIn()}
                  placeholder={`Local number (${selectedCountry.digits} digits)`}
                  maxLength={selectedCountry.digits + 3}
                  style={{ ...inp, flex: 1 }}
                />
              </div>

              {/* Preview */}
              {phone.replace(/\D/g, "").length > 0 && (
                <p style={{ fontSize: "0.75rem", color: "var(--text3)", fontFamily: "sans-serif", marginBottom: 6 }}>
                  Signing in as: <strong style={{ color: "var(--text2)" }}>{fullPhone()}</strong>
                </p>
              )}

              {error && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "0.7rem 1rem", marginBottom: "1rem" }}>
                  <p style={{ fontSize: "0.82rem", color: "#EF4444", fontFamily: "sans-serif", margin: 0 }}>{error}</p>
                  {error.includes("register") && (
                    <button onClick={() => router.push("/register")} style={{ marginTop: 5, background: "none", border: "none", color: "#D97706", fontSize: "0.8rem", cursor: "pointer", fontFamily: "sans-serif", fontWeight: 600, padding: 0 }}>
                      Create an account →
                    </button>
                  )}
                </div>
              )}

              <button onClick={handleSignIn} disabled={loading || !phone.trim()} style={{
                width: "100%", background: "#D97706", color: "#fff", border: "none",
                borderRadius: 10, padding: "13px", fontSize: "0.95rem", fontWeight: 700,
                cursor: loading || !phone.trim() ? "default" : "pointer",
                fontFamily: "sans-serif", opacity: loading || !phone.trim() ? 0.7 : 1,
                marginBottom: "1.25rem",
              }}>
                {loading ? "Signing in..." : "Sign in"}
              </button>

              <p style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--text3)", fontFamily: "sans-serif" }}>
                New to Dare?{" "}
                <button onClick={() => router.push("/register")} style={{ background: "none", border: "none", color: "#D97706", cursor: "pointer", fontFamily: "sans-serif", fontSize: "0.82rem", fontWeight: 600 }}>
                  Create an account
                </button>
              </p>

              <div style={{ marginTop: "2rem", padding: "0.85rem 1rem", background: "var(--bg2)", borderRadius: 10, border: "0.5px solid var(--border)" }}>
                <p style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif", lineHeight: 1.6, margin: 0 }}>
                  <strong style={{ color: "var(--text2)" }}>Prototype note:</strong> Production will send a one-time SMS code to your phone. No passwords needed. Feature phones can also dial <strong style={{ color: "#D97706" }}>*447#</strong>.
                </p>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}
