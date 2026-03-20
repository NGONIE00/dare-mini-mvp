"use client";
export const dynamic = "force-dynamic";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ThemeToggle";

const STEPS = ["Phone", "Profile", "Avatar", "Done"];

const AVATAR_COLORS = [
  "#D97706", "#059669", "#3B82F6", "#7C3AED",
  "#EF4444", "#EC4899", "#0891B2", "#65A30D",
];

const INITIALS_FROM = (name: string) =>
  name.trim().split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

export default function Register() {
  const router = useRouter();

  /* ── step ── */
  const [step, setStep] = useState(0);

  /* ── step 0: phone ── */
  const [phone,      setPhone]      = useState("");
  const [phoneError, setPhoneError] = useState("");

  /* ── step 1: profile ── */
  const [displayName,    setDisplayName]    = useState("");
  const [bio,            setBio]            = useState("");
  const [userType,       setUserType]       = useState<"listener" | "host">("listener");
  const [profileErrors,  setProfileErrors]  = useState<Record<string, string>>({});

  /* ── step 2: avatar ── */
  const [avatarColor,    setAvatarColor]    = useState(AVATAR_COLORS[0]);
  const [avatarEmoji,    setAvatarEmoji]    = useState("");
  const [useEmoji,       setUseEmoji]       = useState(false);
  const [photoFile,      setPhotoFile]      = useState<File | null>(null);
  const [photoPreview,   setPhotoPreview]   = useState<string | null>(null);
  const [uploadMode,     setUploadMode]     = useState<"initials" | "emoji" | "photo">("initials");
  const [dragOver,       setDragOver]       = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── submit ── */
  const [loading,     setLoading]     = useState(false);
  const [submitError, setSubmitError] = useState("");

  /* ── validation ── */
  const validatePhone = () => {
    const cleaned = phone.replace(/\D/g, "");
    if (!cleaned) { setPhoneError("Phone number is required"); return false; }
    if (cleaned.length < 7) { setPhoneError("Enter a valid phone number"); return false; }
    setPhoneError(""); return true;
  };

  const validateProfile = () => {
    const e: Record<string, string> = {};
    if (!displayName.trim()) e.displayName = "Display name is required";
    else if (displayName.trim().length < 2) e.displayName = "Name must be at least 2 characters";
    setProfileErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── photo handling ── */
  const handlePhotoFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) { setSubmitError("Photo must be under 5MB"); return; }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = e => {
      setPhotoPreview(e.target?.result as string);
      setUploadMode("photo");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handlePhotoFile(file);
  };

  /* ── upload photo to Supabase storage ── */
  const uploadPhoto = async (userId: string): Promise<string | null> => {
    if (!photoFile) return null;
    try {
      const ext = photoFile.name.split(".").pop() ?? "jpg";
      const path = `avatars/${userId}.${ext}`;
      const { error } = await supabase.storage
        .from("profiles")
        .upload(path, photoFile, { upsert: true, contentType: photoFile.type });
      if (error) { console.warn("Photo upload failed:", error); return null; }
      const { data } = supabase.storage.from("profiles").getPublicUrl(path);
      return data.publicUrl;
    } catch { return null; }
  };

  /* ── submit to Supabase ── */
  const handleSubmit = async () => {
    setLoading(true);
    setSubmitError("");
    try {
      const cleaned = phone.replace(/\D/g, "");
      const fakeEmail = `${cleaned}@dare.prototype`;
      const password = Math.random().toString(36).slice(-12) + "Aa1!";

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: fakeEmail,
        password,
        options: { data: { phone_hash: phone, display_name: displayName } },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("No user returned");

      const uid = authData.user.id;

      /* upload photo if provided */
      const photoUrl = uploadMode === "photo" ? await uploadPhoto(uid) : null;

      const { error: profileError } = await supabase.from("profiles").insert({
        id:           uid,
        phone_hash:   phone,
        display_name: displayName.trim(),
        bio:          bio.trim(),
        user_type:    userType,
        ...(photoUrl ? { avatar_url: photoUrl } : {}),
      });

      if (profileError) throw profileError;

      await supabase.from("wallets").insert({
        user_id: uid, balance: 0, currency: "USD",
      });

      setStep(3);
    } catch (err: any) {
      setSubmitError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── avatar preview component ── */
  const AvatarPreview = ({ size = 80 }: { size?: number }) => (
    <div style={{
      width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
      background: uploadMode === "photo" && photoPreview ? "transparent" : avatarColor,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: uploadMode === "emoji" && avatarEmoji ? size * 0.38 : size * 0.3,
      fontWeight: 700, color: "#fff", fontFamily: "sans-serif",
      border: "3px solid var(--bg)", outline: `2px solid ${avatarColor}`,
      transition: "background 0.3s",
    }}>
      {uploadMode === "photo" && photoPreview ? (
        <img src={photoPreview} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : uploadMode === "emoji" && avatarEmoji ? avatarEmoji
        : INITIALS_FROM(displayName)}
    </div>
  );

  /* ── shared styles ── */
  const input: React.CSSProperties = {
    width: "100%", background: "var(--bg2)", border: "0.5px solid var(--border2)",
    borderRadius: 6, padding: "10px 12px", fontSize: "0.9rem", color: "var(--text)",
    fontFamily: "sans-serif", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
  };
  const btnP: React.CSSProperties = {
    width: "100%", background: "#D97706", color: "#fff", border: "none", borderRadius: 6,
    padding: "12px", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer",
    fontFamily: "sans-serif", transition: "background 0.2s",
  };
  const btnGhost: React.CSSProperties = {
    width: "100%", background: "transparent", color: "var(--text2)",
    border: "0.5px solid var(--border2)", borderRadius: 6, padding: "11px",
    fontSize: "0.9rem", cursor: "pointer", fontFamily: "sans-serif",
  };
  const fieldLabel: React.CSSProperties = {
    display: "block", fontSize: "0.78rem", fontWeight: 600,
    marginBottom: "0.4rem", color: "var(--text)", fontFamily: "sans-serif",
  };
  const fieldHint: React.CSSProperties = {
    fontSize: "0.7rem", color: "var(--text3)", marginBottom: "0.4rem",
    display: "block", fontFamily: "sans-serif",
  };
  const errStyle: React.CSSProperties = {
    fontSize: "0.72rem", color: "#EF4444", marginTop: 4, fontFamily: "sans-serif",
  };

  return (
    <>
      {/* NAV */}
      <nav style={{ background: "var(--bg)", borderBottom: "1px solid var(--divider)", padding: "0.9rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50, transition: "background 0.3s" }}>
        <div style={{ cursor: "pointer" }} onClick={() => router.push("/")}>
          <div style={{ color: "#D97706", fontSize: "1rem", fontWeight: 700, lineHeight: 1.1 }}>DARE</div>
          <div style={{ color: "var(--text3)", fontSize: "0.68rem", fontFamily: "sans-serif" }}>The Digital Council</div>
        </div>
        <ThemeToggle />
      </nav>

      <div style={{ minHeight: "calc(100vh - 60px)", background: "var(--bg)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "3rem 1.5rem 5rem", transition: "background 0.3s" }}>
        <div style={{ width: "100%", maxWidth: 440 }}>

          {/* Progress bar */}
          {step < 3 && (
            <div style={{ marginBottom: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                {STEPS.slice(0, 3).map((s, i) => (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%", display: "flex",
                      alignItems: "center", justifyContent: "center", fontSize: "0.68rem",
                      fontWeight: 700, fontFamily: "sans-serif",
                      background: i <= step ? "#D97706" : "var(--bg2)",
                      color: i <= step ? "#fff" : "var(--text3)",
                      border: i > step ? "0.5px solid var(--border2)" : "none",
                    }}>{i < step ? "✓" : i + 1}</div>
                    <span style={{ fontSize: "0.72rem", color: i === step ? "var(--text)" : "var(--text3)", fontFamily: "sans-serif" }}>{s}</span>
                  </div>
                ))}
              </div>
              <div style={{ height: 3, background: "var(--bg2)", borderRadius: 100, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(step / 2) * 100}%`, background: "#D97706", borderRadius: 100, transition: "width 0.4s ease" }} />
              </div>
            </div>
          )}

          {/* ── STEP 0: PHONE ── */}
          {step === 0 && (
            <div>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.4rem" }}>Welcome to Dare</h1>
              <p style={{ fontSize: "0.85rem", color: "var(--text2)", lineHeight: 1.65, marginBottom: "2rem", fontFamily: "sans-serif" }}>
                Enter your phone number to get started. No email required.
              </p>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={fieldLabel}>Phone number <span style={{ color: "#EF4444" }}>*</span></label>
                <span style={fieldHint}>Include your country code, e.g. +263 77 123 4567</span>
                <input style={{ ...input, borderColor: phoneError ? "#EF4444" : "var(--border2)" }}
                  type="tel" value={phone} placeholder="+263 77 123 4567"
                  onChange={e => { setPhone(e.target.value); setPhoneError(""); }}
                  onKeyDown={e => e.key === "Enter" && validatePhone() && setStep(1)}
                />
                {phoneError && <span style={errStyle}>{phoneError}</span>}
              </div>

              <button style={btnP} onClick={() => { if (validatePhone()) setStep(1); }}>Continue →</button>

              <p style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--text3)", marginTop: "1.25rem", fontFamily: "sans-serif", lineHeight: 1.6 }}>
                By continuing you agree to our Terms of Service and Privacy Policy.
              </p>
              <div style={{ marginTop: "1.25rem", textAlign: "center" }}>
                <button onClick={() => router.push("/rooms")} style={{ background: "none", border: "none", color: "var(--text3)", fontSize: "0.78rem", fontFamily: "sans-serif", cursor: "pointer" }}>
                  Already have an account? Sign in
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 1: PROFILE ── */}
          {step === 1 && (
            <div>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.4rem" }}>Build your profile</h1>
              <p style={{ fontSize: "0.85rem", color: "var(--text2)", lineHeight: 1.65, marginBottom: "2rem", fontFamily: "sans-serif" }}>
                Tell the community who you are. This is what others will see.
              </p>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={fieldLabel}>Display name <span style={{ color: "#EF4444" }}>*</span></label>
                <input style={{ ...input, borderColor: profileErrors.displayName ? "#EF4444" : "var(--border2)" }}
                  type="text" value={displayName} maxLength={40} placeholder="e.g. Tendai Moyo"
                  onChange={e => { setDisplayName(e.target.value); setProfileErrors(p => ({ ...p, displayName: "" })); }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                  {profileErrors.displayName ? <span style={errStyle}>{profileErrors.displayName}</span> : <span />}
                  <span style={{ fontSize: "0.68rem", color: "var(--text3)", fontFamily: "sans-serif" }}>{displayName.length} / 40</span>
                </div>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={fieldLabel}>Bio</label>
                <span style={fieldHint}>A short description — what you do, what you're passionate about.</span>
                <textarea style={{ ...input, resize: "vertical", minHeight: 88 } as React.CSSProperties}
                  value={bio} maxLength={200}
                  placeholder="e.g. Community health worker in Harare. Passionate about accessible healthcare."
                  onChange={e => setBio(e.target.value)}
                />
                <div style={{ fontSize: "0.68rem", color: "var(--text3)", textAlign: "right", marginTop: 3, fontFamily: "sans-serif" }}>{bio.length} / 200</div>
              </div>

              <div style={{ marginBottom: "1.75rem" }}>
                <label style={fieldLabel}>I am joining as</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  {(["listener", "host"] as const).map(type => (
                    <button key={type} onClick={() => setUserType(type)} style={{
                      padding: "1rem", borderRadius: 8, cursor: "pointer", textAlign: "left",
                      background: userType === type ? "rgba(217,119,6,0.08)" : "var(--bg2)",
                      border: `${userType === type ? "2px" : "0.5px"} solid ${userType === type ? "#D97706" : "var(--border2)"}`,
                      transition: "all 0.15s",
                    }}>
                      <div style={{ fontSize: "1.2rem", marginBottom: "0.4rem" }}>{type === "listener" ? "🎧" : "🎙️"}</div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif", textTransform: "capitalize" }}>{type}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif", marginTop: 2 }}>
                        {type === "listener" ? "Browse and join rooms" : "Create and host sessions"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button style={btnGhost} onClick={() => setStep(0)}>← Back</button>
                <button style={btnP} onClick={() => { if (validateProfile()) setStep(2); }}>Continue →</button>
              </div>
            </div>
          )}

          {/* ── STEP 2: AVATAR ── */}
          {step === 2 && (
            <div>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.4rem" }}>Your avatar</h1>
              <p style={{ fontSize: "0.85rem", color: "var(--text2)", lineHeight: 1.65, marginBottom: "2rem", fontFamily: "sans-serif" }}>
                Upload a photo, pick a colour, or use an emoji.
              </p>

              {/* Live preview */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
                <AvatarPreview size={88} />
              </div>

              {/* Mode tabs */}
              <div style={{ display: "flex", gap: 6, marginBottom: "1.5rem" }}>
                {(["photo", "initials", "emoji"] as const).map(mode => (
                  <button key={mode} onClick={() => setUploadMode(mode)} style={{
                    flex: 1, padding: "7px", borderRadius: 6, cursor: "pointer", fontSize: "0.75rem",
                    fontWeight: 600, fontFamily: "sans-serif", textTransform: "capitalize",
                    background: uploadMode === mode ? "rgba(217,119,6,0.1)" : "var(--bg2)",
                    border: `0.5px solid ${uploadMode === mode ? "#D97706" : "var(--border2)"}`,
                    color: uploadMode === mode ? "#D97706" : "var(--text2)",
                    transition: "all 0.15s",
                  }}>{mode === "initials" ? "Initials" : mode === "photo" ? "📷 Photo" : "😊 Emoji"}</button>
                ))}
              </div>

              {/* Photo upload */}
              {uploadMode === "photo" && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f); }}
                  />
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${dragOver ? "#D97706" : "var(--border2)"}`,
                      borderRadius: 10, padding: "2rem 1rem", textAlign: "center",
                      cursor: "pointer", background: dragOver ? "rgba(217,119,6,0.04)" : "var(--bg2)",
                      transition: "all 0.2s",
                    }}
                  >
                    {photoPreview ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                        <img src={photoPreview} alt="preview" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid #D97706" }} />
                        <span style={{ fontSize: "0.78rem", color: "var(--text2)", fontFamily: "sans-serif" }}>
                          {photoFile?.name} · Click to change
                        </span>
                      </div>
                    ) : (
                      <>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 8px", display: "block" }}>
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", fontFamily: "sans-serif", marginBottom: 4 }}>
                          Upload a photo
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text3)", fontFamily: "sans-serif" }}>
                          Drag & drop or click to browse · JPG, PNG, GIF · Max 5MB
                        </div>
                      </>
                    )}
                  </div>
                  {photoPreview && (
                    <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); setUploadMode("initials"); }}
                      style={{ marginTop: 8, background: "none", border: "none", color: "#EF4444", fontSize: "0.75rem", fontFamily: "sans-serif", cursor: "pointer" }}>
                      Remove photo
                    </button>
                  )}
                </div>
              )}

              {/* Initials colour picker */}
              {uploadMode === "initials" && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={fieldLabel}>Profile colour</label>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {AVATAR_COLORS.map(c => (
                      <button key={c} onClick={() => setAvatarColor(c)} style={{
                        width: 36, height: 36, borderRadius: "50%", background: c, cursor: "pointer",
                        border: avatarColor === c ? "3px solid var(--text)" : "2px solid transparent",
                        transition: "border 0.15s",
                      }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Emoji */}
              {uploadMode === "emoji" && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={fieldLabel}>Choose an emoji</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                    {["😊", "🦁", "🌟", "🎯", "🌍", "🎙️", "🦅", "🌿"].map(e => (
                      <button key={e} onClick={() => setAvatarEmoji(e)} style={{
                        width: 40, height: 40, borderRadius: 8, fontSize: "1.3rem", cursor: "pointer",
                        background: avatarEmoji === e ? "rgba(217,119,6,0.12)" : "var(--bg2)",
                        border: `0.5px solid ${avatarEmoji === e ? "#D97706" : "var(--border2)"}`,
                        transition: "all 0.15s",
                      }}>{e}</button>
                    ))}
                  </div>
                  <input style={{ ...input, maxWidth: 120, textAlign: "center", fontSize: "1.2rem" }}
                    type="text" maxLength={2} value={avatarEmoji} placeholder="or type..."
                    onChange={e => setAvatarEmoji(e.target.value)}
                  />
                </div>
              )}

              {submitError && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "0.75rem 1rem", marginBottom: "1rem" }}>
                  <p style={{ fontSize: "0.8rem", color: "#EF4444", fontFamily: "sans-serif" }}>{submitError}</p>
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button style={btnGhost} onClick={() => setStep(1)}>← Back</button>
                <button style={{ ...btnP, background: loading ? "var(--border2)" : "#D97706", color: loading ? "var(--text3)" : "#fff", cursor: loading ? "default" : "pointer" }}
                  onClick={handleSubmit} disabled={loading}>
                  {loading ? "Creating account..." : "Create account →"}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: SUCCESS ── */}
          {step === 3 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
                <AvatarPreview size={88} />
              </div>

              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(5,150,105,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", border: "0.5px solid rgba(5,150,105,0.3)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>

              <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.5rem" }}>
                Welcome, {displayName}!
              </h1>
              <p style={{ fontSize: "0.85rem", color: "var(--text2)", lineHeight: 1.65, marginBottom: bio ? "0.5rem" : "2rem", fontFamily: "sans-serif" }}>
                Your account is ready. You joined as a <strong style={{ color: "var(--text)", textTransform: "capitalize" }}>{userType}</strong>.
              </p>
              {bio && (
                <p style={{ fontSize: "0.8rem", color: "var(--text3)", lineHeight: 1.6, marginBottom: "2rem", fontFamily: "sans-serif", fontStyle: "italic", padding: "0 0.5rem" }}>
                  "{bio}"
                </p>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <button style={btnP} onClick={() => router.push("/rooms")}>Browse rooms →</button>
                {userType === "host" && (
                  <button style={btnGhost} onClick={() => router.push("/rooms/create")}>+ Start your first room</button>
                )}
              </div>

              <p style={{ fontSize: "0.7rem", color: "var(--text3)", marginTop: "1.5rem", fontFamily: "sans-serif", lineHeight: 1.6 }}>
                This is a prototype. Your data is stored securely on Supabase.
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
