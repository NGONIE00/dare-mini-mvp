"use client";
export const dynamic = "force-dynamic";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ThemeToggle";

/* ─────────────────────────────────────────
   COUNTRY DATA  (flag · dial code · name · max digits)
───────────────────────────────────────── */
const COUNTRIES = [
  { code: "ZW", dial: "+263", name: "Zimbabwe",           flag: "🇿🇼", digits: 9  },
  { code: "ZA", dial: "+27",  name: "South Africa",       flag: "🇿🇦", digits: 9  },
  { code: "ZM", dial: "+260", name: "Zambia",             flag: "🇿🇲", digits: 9  },
  { code: "MZ", dial: "+258", name: "Mozambique",         flag: "🇲🇿", digits: 9  },
  { code: "BW", dial: "+267", name: "Botswana",           flag: "🇧🇼", digits: 7  },
  { code: "NA", dial: "+264", name: "Namibia",            flag: "🇳🇦", digits: 9  },
  { code: "KE", dial: "+254", name: "Kenya",              flag: "🇰🇪", digits: 9  },
  { code: "TZ", dial: "+255", name: "Tanzania",           flag: "🇹🇿", digits: 9  },
  { code: "UG", dial: "+256", name: "Uganda",             flag: "🇺🇬", digits: 9  },
  { code: "ET", dial: "+251", name: "Ethiopia",           flag: "🇪🇹", digits: 9  },
  { code: "NG", dial: "+234", name: "Nigeria",            flag: "🇳🇬", digits: 10 },
  { code: "GH", dial: "+233", name: "Ghana",              flag: "🇬🇭", digits: 9  },
  { code: "SN", dial: "+221", name: "Senegal",            flag: "🇸🇳", digits: 9  },
  { code: "CI", dial: "+225", name: "Côte d'Ivoire",      flag: "🇨🇮", digits: 10 },
  { code: "CM", dial: "+237", name: "Cameroon",           flag: "🇨🇲", digits: 9  },
  { code: "RW", dial: "+250", name: "Rwanda",             flag: "🇷🇼", digits: 9  },
  { code: "MG", dial: "+261", name: "Madagascar",         flag: "🇲🇬", digits: 9  },
  { code: "MW", dial: "+265", name: "Malawi",             flag: "🇲🇼", digits: 9  },
  { code: "GB", dial: "+44",  name: "United Kingdom",     flag: "🇬🇧", digits: 10 },
  { code: "US", dial: "+1",   name: "United States",      flag: "🇺🇸", digits: 10 },
  { code: "CA", dial: "+1",   name: "Canada",             flag: "🇨🇦", digits: 10 },
  { code: "AU", dial: "+61",  name: "Australia",          flag: "🇦🇺", digits: 9  },
  { code: "IN", dial: "+91",  name: "India",              flag: "🇮🇳", digits: 10 },
  { code: "CN", dial: "+86",  name: "China",              flag: "🇨🇳", digits: 11 },
  { code: "DE", dial: "+49",  name: "Germany",            flag: "🇩🇪", digits: 11 },
  { code: "FR", dial: "+33",  name: "France",             flag: "🇫🇷", digits: 9  },
  { code: "PT", dial: "+351", name: "Portugal",           flag: "🇵🇹", digits: 9  },
  { code: "BR", dial: "+55",  name: "Brazil",             flag: "🇧🇷", digits: 11 },
];

const AVATAR_COLORS = [
  "#D97706","#059669","#3B82F6","#7C3AED",
  "#EF4444","#EC4899","#0891B2","#65A30D",
];

const STEPS = ["Phone", "Profile", "Avatar", "Done"];

const sanitise = (s: string) => s.replace(/[<>'"]/g, "").trim();

const INITIALS_FROM = (name: string) =>
  name.trim().split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

/* ─────────────────────────────────────────
   COMPONENT
───────────────────────────────────────── */
export default function Register() {
  const router = useRouter();

  const [step, setStep] = useState(0);

  /* step 0 */
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [countryOpen,     setCountryOpen]     = useState(false);
  const [countrySearch,   setCountrySearch]   = useState("");
  const [phone,           setPhone]           = useState("");
  const [phoneError,      setPhoneError]      = useState("");

  /* step 1 */
  const [displayName,   setDisplayName]   = useState("");
  const [bio,           setBio]           = useState("");
  const [userType,      setUserType]      = useState<"listener"|"host">("listener");
  const [profileErrors, setProfileErrors] = useState<Record<string,string>>({});

  /* step 2 */
  const [avatarColor,  setAvatarColor]  = useState(AVATAR_COLORS[0]);
  const [photoFile,    setPhotoFile]    = useState<File|null>(null);
  const [photoPreview, setPhotoPreview] = useState<string|null>(null);
  const [dragOver,     setDragOver]     = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* submit */
  const [loading,     setLoading]     = useState(false);
  const [submitError, setSubmitError] = useState("");

  /* ── helpers ── */
  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.dial.includes(countrySearch)
  );

  const fullPhone = () => {
    const digits = phone.replace(/\D/g, "");
    return `${selectedCountry.dial}${digits}`;
  };

  /* ── validation ── */
  const validatePhone = () => {
    const digits = phone.replace(/\D/g, "");
    if (!digits) { setPhoneError("Phone number is required"); return false; }
    if (digits.length < 5) { setPhoneError("Too short — enter a valid local number"); return false; }
    if (digits.length > 15) { setPhoneError("Too long — enter local digits only"); return false; }
    setPhoneError(""); return true;
  };

  const validateProfile = () => {
    const e: Record<string,string> = {};
    const name = sanitise(displayName);
    if (!name) e.displayName = "Display name is required";
    else if (name.length < 2) e.displayName = "Name must be at least 2 characters";
    else if (name.length > 50) e.displayName = "Name must be under 50 characters";
    const bioClean = sanitise(bio);
    if (bioClean.length > 200) e.bio = "Bio must be under 200 characters";
    setProfileErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── photo drop ── */
  const handleFileDrop = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) { alert("Photo must be under 5 MB"); return; }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = e => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  /* ── SUBMIT ── */
  const handleSubmit = async () => {
    setLoading(true);
    setSubmitError("");
    try {
      const fp = fullPhone();
      /* Supabase doesn't support SMS OTP on free plan directly,
         so we use the phone-as-email prototype convention:
         <digits>@dare.app — e.g. 2637111111@dare.app
         Production: swap for supabase.auth.signInWithOtp({ phone: fp }) + Twilio */
      const digits = fp.replace(/\D/g, "");
      const fakeEmail = `${digits}@dare.app`;
      const password  = `Dare${digits}#Zw`;

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: fakeEmail, password,
      });
      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setSubmitError("This number is already registered. Please sign in instead.");
          setLoading(false); return;
        }
        throw signUpError;
      }
      if (!authData.user) throw new Error("No user returned from auth");

      const uid = authData.user.id;

      /* Upload avatar if photo chosen */
      let avatarUrl: string | null = null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("profiles")
          .upload(`avatars/${uid}.${ext}`, photoFile, { upsert: true });
        if (!uploadError && uploadData) {
          const { data: { publicUrl } } = supabase.storage.from("profiles").getPublicUrl(uploadData.path);
          avatarUrl = publicUrl;
        }
      }

      /* Create profile */
      const { error: profileError } = await supabase.from("profiles").insert({
        id:           uid,
        phone_hash:   fp,
        display_name: sanitise(displayName),
        bio:          sanitise(bio),
        user_type:    userType,
        avatar_url:   avatarUrl,
        follower_count:  0,
        following_count: 0,
      });
      if (profileError) throw profileError;

      /* Create wallet */
      await supabase.from("wallets").insert({ user_id: uid, balance: 0, currency: "USD" });

      setStep(3);
      setTimeout(() => {
        router.push(userType === "host" ? "/rooms/create" : "/rooms");
      }, 2500);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setSubmitError(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ── STYLES ── */
  const inp: React.CSSProperties = {
    width: "100%", background: "var(--bg2)", border: "1px solid var(--border2)",
    borderRadius: 10, padding: "11px 14px", fontSize: "0.95rem", color: "var(--text)",
    fontFamily: "sans-serif", outline: "none", boxSizing: "border-box" as const,
    transition: "border-color 0.2s",
  };
  const errTxt: React.CSSProperties = { fontSize: "0.75rem", color: "#EF4444", marginTop: 4, fontFamily: "sans-serif" };
  const lbl: React.CSSProperties = { display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", fontFamily: "sans-serif", marginBottom: 5 };
  const btnAmber: React.CSSProperties = { width: "100%", background: "#D97706", color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", fontFamily: "sans-serif", transition: "opacity 0.2s" };
  const btnGhost: React.CSSProperties = { width: "100%", background: "transparent", color: "var(--text2)", border: "1px solid var(--border2)", borderRadius: 10, padding: "11px", fontSize: "0.88rem", cursor: "pointer", fontFamily: "sans-serif" };

  const previewInitials = INITIALS_FROM(displayName || "You");

  return (
    <>
      <nav style={{ background: "var(--bg)", borderBottom: "1px solid var(--divider)", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ cursor: "pointer" }} onClick={() => router.push("/")}>
          <div style={{ color: "#D97706", fontSize: "1rem", fontWeight: 700, lineHeight: 1.1 }}>DARE</div>
          <div style={{ color: "var(--text3)", fontSize: "0.65rem", fontFamily: "sans-serif" }}>The Digital Council</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ThemeToggle />
          <button onClick={() => router.push("/signin")} style={{ background: "none", border: "1px solid var(--border2)", borderRadius: 8, padding: "6px 14px", fontSize: "0.8rem", color: "var(--text2)", cursor: "pointer", fontFamily: "sans-serif" }}>
            Sign in
          </button>
        </div>
      </nav>

      <div style={{ background: "var(--bg)", minHeight: "calc(100vh - 60px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "2rem 1rem 5rem", transition: "background 0.3s" }}>
        <div style={{ width: "100%", maxWidth: 440 }}>

          {/* Progress bar */}
          <div style={{ display: "flex", gap: 6, marginBottom: "2rem" }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ flex: 1 }}>
                <div style={{ height: 3, borderRadius: 2, background: i <= step ? "#D97706" : "var(--bg2)", transition: "background 0.3s" }} />
                <div style={{ fontSize: "0.65rem", color: i <= step ? "#D97706" : "var(--text3)", fontFamily: "sans-serif", marginTop: 4, textAlign: "center" as const, fontWeight: i === step ? 700 : 400 }}>{s}</div>
              </div>
            ))}
          </div>

          {/* ── STEP 0: PHONE ── */}
          {step === 0 && (
            <div>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text)", marginBottom: "0.4rem", fontFamily: "sans-serif" }}>Join the dare</h1>
              <p style={{ fontSize: "0.85rem", color: "var(--text2)", fontFamily: "sans-serif", lineHeight: 1.6, marginBottom: "1.75rem" }}>
                Enter your phone number to get started. No email required.
              </p>

              <label style={lbl}>Phone number</label>

              {/* Country + number row */}
              <div style={{ display: "flex", gap: 8, marginBottom: 4, position: "relative" }}>

                {/* Country picker trigger */}
                <button onClick={() => setCountryOpen(v => !v)} style={{
                  display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                  background: "var(--bg2)", border: "1px solid var(--border2)",
                  borderRadius: 10, padding: "11px 10px", cursor: "pointer",
                  fontSize: "0.9rem", fontFamily: "sans-serif", color: "var(--text)",
                  minWidth: 90, transition: "border-color 0.2s",
                }}>
                  <span>{selectedCountry.flag}</span>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>{selectedCountry.dial}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </button>

                {/* Country dropdown */}
                {countryOpen && (
                  <div style={{ position: "absolute", top: "100%", left: 0, width: 280, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", overflow: "hidden", marginTop: 4 }}>
                    <div style={{ padding: "0.6rem" }}>
                      <input
                        autoFocus
                        value={countrySearch}
                        onChange={e => setCountrySearch(e.target.value)}
                        placeholder="Search country or code..."
                        style={{ ...inp, padding: "8px 12px", fontSize: "0.85rem", marginBottom: 0 }}
                      />
                    </div>
                    <div style={{ maxHeight: 220, overflowY: "auto" }}>
                      {filteredCountries.map(c => (
                        <button key={`${c.code}-${c.dial}`} onClick={() => { setSelectedCountry(c); setCountryOpen(false); setCountrySearch(""); }}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: c.code === selectedCountry.code ? "rgba(217,119,6,0.08)" : "none", border: "none", cursor: "pointer", textAlign: "left" as const, transition: "background 0.15s" }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "var(--bg2)"}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = c.code === selectedCountry.code ? "rgba(217,119,6,0.08)" : "none"}
                        >
                          <span style={{ fontSize: "1.1rem" }}>{c.flag}</span>
                          <span style={{ flex: 1, fontSize: "0.85rem", color: "var(--text)", fontFamily: "sans-serif" }}>{c.name}</span>
                          <span style={{ fontSize: "0.8rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{c.dial}</span>
                        </button>
                      ))}
                      {filteredCountries.length === 0 && (
                        <p style={{ padding: "1rem", textAlign: "center", color: "var(--text3)", fontSize: "0.82rem", fontFamily: "sans-serif" }}>No results</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Phone number input */}
                <input
                  type="tel"
                  value={phone}
                  onChange={e => {
                    /* only allow digits, spaces, hyphens */
                    const cleaned = e.target.value.replace(/[^\d\s\-]/g, "");
                    setPhone(cleaned);
                    setPhoneError("");
                  }}
                  onBlur={validatePhone}
                  placeholder={`Local number (${selectedCountry.digits} digits)`}
                  maxLength={selectedCountry.digits + 3}
                  style={{ ...inp, flex: 1 }}
                />
              </div>

              {/* Full number preview */}
              {phone.replace(/\D/g, "").length > 0 && (
                <p style={{ fontSize: "0.75rem", color: "var(--text3)", fontFamily: "sans-serif", marginBottom: 4 }}>
                  Full number: <strong style={{ color: "var(--text2)" }}>{fullPhone()}</strong>
                </p>
              )}
              {phoneError && <p style={errTxt}>{phoneError}</p>}

              <p style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif", lineHeight: 1.6, marginTop: 8, marginBottom: "1.5rem" }}>
                In production, you'll receive a one-time SMS code. This prototype uses your number directly.
              </p>

              <button style={btnAmber} onClick={() => { if (validatePhone()) setStep(1); }}>
                Continue →
              </button>

              <p style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--text3)", fontFamily: "sans-serif", marginTop: "1.25rem" }}>
                Already have an account?{" "}
                <button onClick={() => router.push("/signin")} style={{ background: "none", border: "none", color: "#D97706", cursor: "pointer", fontFamily: "sans-serif", fontSize: "0.8rem", fontWeight: 600 }}>
                  Sign in
                </button>
              </p>
            </div>
          )}

          {/* ── STEP 1: PROFILE ── */}
          {step === 1 && (
            <div>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text)", marginBottom: "0.4rem", fontFamily: "sans-serif" }}>Your profile</h1>
              <p style={{ fontSize: "0.85rem", color: "var(--text2)", fontFamily: "sans-serif", lineHeight: 1.6, marginBottom: "1.75rem" }}>
                How should the community know you?
              </p>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={lbl}>Display name <span style={{ color: "#EF4444" }}>*</span></label>
                <input style={inp} maxLength={50} value={displayName}
                  placeholder="e.g. Dr. Tendai Moyo"
                  onChange={e => { setDisplayName(sanitise(e.target.value)); setProfileErrors({}); }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                  {profileErrors.displayName && <span style={errTxt}>{profileErrors.displayName}</span>}
                  <span style={{ fontSize: "0.68rem", color: "var(--text3)", fontFamily: "sans-serif", marginLeft: "auto" }}>{displayName.length}/50</span>
                </div>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={lbl}>Bio <span style={{ color: "var(--text3)", fontWeight: 400 }}>(optional)</span></label>
                <textarea
                  maxLength={200} value={bio}
                  placeholder="Tell the community a little about yourself..."
                  onChange={e => { setBio(sanitise(e.target.value)); setProfileErrors({}); }}
                  style={{ ...inp, resize: "vertical" as const, minHeight: 80 }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                  {profileErrors.bio && <span style={errTxt}>{profileErrors.bio}</span>}
                  <span style={{ fontSize: "0.68rem", color: "var(--text3)", fontFamily: "sans-serif", marginLeft: "auto" }}>{bio.length}/200</span>
                </div>
              </div>

              <div style={{ marginBottom: "1.75rem" }}>
                <label style={lbl}>I want to</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {(["listener", "host"] as const).map(t => (
                    <button key={t} onClick={() => setUserType(t)} style={{
                      padding: "14px 10px", borderRadius: 12, cursor: "pointer", textAlign: "left" as const,
                      background: userType === t ? "rgba(217,119,6,0.08)" : "var(--bg2)",
                      border: `1.5px solid ${userType === t ? "#D97706" : "var(--border2)"}`,
                      transition: "all 0.2s",
                    }}>
                      <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>{t === "listener" ? "🎧" : "🎙️"}</div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: userType === t ? "#D97706" : "var(--text)", fontFamily: "sans-serif", textTransform: "capitalize" }}>{t}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif", marginTop: 2 }}>
                        {t === "listener" ? "Join rooms & participate" : "Host sessions & earn"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button style={btnGhost} onClick={() => setStep(0)}>← Back</button>
                <button style={btnAmber} onClick={() => { if (validateProfile()) setStep(2); }}>Continue →</button>
              </div>
            </div>
          )}

          {/* ── STEP 2: AVATAR ── */}
          {step === 2 && (
            <div>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text)", marginBottom: "0.4rem", fontFamily: "sans-serif" }}>Your avatar</h1>
              <p style={{ fontSize: "0.85rem", color: "var(--text2)", fontFamily: "sans-serif", lineHeight: 1.6, marginBottom: "1.75rem" }}>
                Choose a colour or upload a photo.
              </p>

              {/* Avatar preview */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: photoPreview ? "transparent" : avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", fontWeight: 700, color: "#fff", fontFamily: "sans-serif", overflow: "hidden", border: "3px solid var(--border2)" }}>
                  {photoPreview
                    ? <img src={photoPreview} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : previewInitials}
                </div>
              </div>

              {/* Colour picker */}
              {!photoPreview && (
                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={{ ...lbl, marginBottom: 8 }}>Background colour</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                    {AVATAR_COLORS.map(c => (
                      <button key={c} onClick={() => setAvatarColor(c)} style={{
                        width: 34, height: 34, borderRadius: "50%", background: c, border: "none",
                        cursor: "pointer", outline: avatarColor === c ? `3px solid ${c}` : "none",
                        outlineOffset: 2, transition: "outline 0.15s",
                      }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Photo upload */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={lbl}>Profile photo <span style={{ color: "var(--text3)", fontWeight: 400 }}>(optional, max 5 MB)</span></label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileDrop(f); }}
                  style={{ border: `2px dashed ${dragOver ? "#D97706" : "var(--border2)"}`, borderRadius: 12, padding: "1.25rem", textAlign: "center" as const, cursor: "pointer", background: dragOver ? "rgba(217,119,6,0.05)" : "var(--bg2)", transition: "all 0.2s" }}
                >
                  <p style={{ fontSize: "0.82rem", color: "var(--text3)", fontFamily: "sans-serif", margin: 0 }}>
                    {photoPreview ? "✓ Photo selected — click to change" : "Click or drag a photo here"}
                  </p>
                </div>
                {photoPreview && (
                  <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} style={{ marginTop: 6, background: "none", border: "none", color: "#EF4444", fontSize: "0.78rem", cursor: "pointer", fontFamily: "sans-serif" }}>
                    Remove photo
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFileDrop(f); }} />
              </div>

              {submitError && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1rem" }}>
                  <p style={{ fontSize: "0.82rem", color: "#EF4444", fontFamily: "sans-serif", margin: 0 }}>{submitError}</p>
                  {submitError.includes("already registered") && (
                    <button onClick={() => router.push("/signin")} style={{ marginTop: 6, background: "none", border: "none", color: "#D97706", fontSize: "0.82rem", cursor: "pointer", fontFamily: "sans-serif", fontWeight: 600, padding: 0 }}>
                      Go to sign in →
                    </button>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button style={btnGhost} onClick={() => setStep(1)}>← Back</button>
                <button style={{ ...btnAmber, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>
                  {loading ? "Creating account..." : "Create account"}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: SUCCESS ── */}
          {step === 3 && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(5,150,105,0.1)", border: "1.5px solid rgba(5,150,105,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text)", marginBottom: "0.5rem", fontFamily: "sans-serif" }}>
                Welcome to Dare, {sanitise(displayName).split(" ")[0]}!
              </h2>
              <p style={{ fontSize: "0.88rem", color: "var(--text2)", fontFamily: "sans-serif", lineHeight: 1.6, marginBottom: "0.5rem" }}>
                Your account is ready.
              </p>
              <p style={{ fontSize: "0.78rem", color: "var(--text3)", fontFamily: "sans-serif" }}>
                {userType === "host" ? "Taking you to create your first room..." : "Taking you to browse rooms..."}
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
