"use client";
import { useRouter } from "next/navigation";

export default function PrivacyPolicy() {
  const router = useRouter();

  const section = (title: string, children: React.ReactNode) => (
    <div style={{ marginBottom: "2.5rem" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif", marginBottom: "0.75rem", paddingBottom: "0.5rem", borderBottom: "0.5px solid var(--border)" }}>{title}</h2>
      <div style={{ fontSize: "0.85rem", color: "var(--text2)", fontFamily: "sans-serif", lineHeight: 1.8 }}>
        {children}
      </div>
    </div>
  );

  const p = (text: string) => (
    <p style={{ margin: "0 0 0.75rem" }}>{text}</p>
  );

  const li = (text: string) => (
    <li style={{ marginBottom: "0.4rem" }}>{text}</li>
  );

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", transition: "background 0.3s" }}>

      {/* Nav */}
      <nav style={{ background: "var(--bg)", borderBottom: "1px solid var(--divider)", padding: "0.9rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ cursor: "pointer" }} onClick={() => router.push("/")}>
          <div style={{ color: "#D97706", fontSize: "1rem", fontWeight: 700, lineHeight: 1.1 }}>DARE</div>
          <div style={{ color: "var(--text3)", fontSize: "0.65rem", fontFamily: "sans-serif" }}>The Digital Council</div>
        </div>
        <button onClick={() => router.back()} style={{ background: "none", border: "0.5px solid var(--border2)", borderRadius: 6, padding: "6px 14px", fontSize: "0.8rem", color: "var(--text2)", cursor: "pointer", fontFamily: "sans-serif" }}>
          ← Back
        </button>
      </nav>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "3rem 1.5rem 6rem" }}>

        {/* Header */}
        <div style={{ marginBottom: "3rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(217,119,6,0.08)", border: "0.5px solid rgba(217,119,6,0.2)", borderRadius: 100, padding: "3px 12px", marginBottom: "1rem" }}>
            <span style={{ color: "#D97706", fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "sans-serif" }}>Legal</span>
          </div>
          <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2rem)", fontWeight: 800, color: "var(--text)", marginBottom: "0.5rem", fontFamily: "sans-serif" }}>Privacy Policy</h1>
          <p style={{ fontSize: "0.82rem", color: "var(--text3)", fontFamily: "sans-serif" }}>
            Effective date: 7 April 2026 · Last updated: 7 April 2026
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--text2)", fontFamily: "sans-serif", lineHeight: 1.7, marginTop: "1rem", padding: "1rem", background: "var(--bg2)", borderRadius: 8, border: "0.5px solid var(--border)" }}>
            Dare — The Digital Council (&quot;Dare&quot;, &quot;we&quot;, &quot;us&quot;) is committed to protecting your privacy. This policy explains how we collect, use, and protect information when you use our platform at dare-mini-mvp.vercel.app and any associated services.
          </p>
        </div>

        {section("1. Information We Collect", <>
          {p("We collect only what is necessary to provide the Dare service.")}
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600, color: "var(--text)" }}>Information you provide:</p>
          <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.75rem" }}>
            {li("Phone number — used to create and identify your account")}
            {li("Display name and bio — shown publicly on your profile")}
            {li("Profile photo — optionally uploaded, stored securely")}
            {li("Room content — titles, descriptions, and chat messages you create")}
          </ul>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600, color: "var(--text)" }}>Information collected automatically:</p>
          <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.75rem" }}>
            {li("Session activity — rooms joined, messages sent, tips made")}
            {li("Device type — used to optimise audio quality settings")}
            {li("Connection quality — used to adapt bandwidth usage")}
          </ul>
          {p("We do not collect location data, advertising identifiers, or browsing history outside of Dare.")}
        </>)}

        {section("2. How We Use Your Information", <>
          {p("Your information is used solely to operate and improve the Dare platform:")}
          <ul style={{ paddingLeft: "1.25rem" }}>
            {li("To create and maintain your account")}
            {li("To connect you with voice rooms and other community members")}
            {li("To process tips and ticket payments via mobile money")}
            {li("To send notifications relevant to your activity")}
            {li("To improve platform performance and reliability")}
            {li("To comply with applicable laws and regulations")}
          </ul>
          {p("We do not use your data for advertising, algorithmic profiling, or sell it to third parties.")}
        </>)}

        {section("3. Creator Sovereignty", <>
          {p("A core principle of Dare is that creators own their audience relationships. This means:")}
          <ul style={{ paddingLeft: "1.25rem" }}>
            {li("Your follower relationships are yours — we do not use them for algorithmic amplification")}
            {li("We do not manipulate room visibility based on engagement metrics")}
            {li("We do not shadow-ban or suppress content without clear policy violation")}
            {li("You can export or delete your data at any time")}
          </ul>
        </>)}

        {section("4. Data Sharing", <>
          {p("We share data only in limited circumstances:")}
          <ul style={{ paddingLeft: "1.25rem" }}>
            {li("Supabase — our database and authentication provider (supabase.com)")}
            {li("Agora — real-time voice infrastructure (agora.io)")}
            {li("Google (Gemini API) — AI-powered features such as room summaries and moderation")}
            {li("Vercel — hosting and deployment infrastructure (vercel.com)")}
            {li("Mobile money providers — for payment processing (EcoCash, Mukuru, OneMoney, M-Pesa)")}
          </ul>
          {p("Each provider processes only the data necessary for their specific function. We do not share your data with advertisers, data brokers, or unrelated third parties.")}
        </>)}

        {section("5. Data Retention", <>
          {p("We retain your data for as long as your account is active. When you delete your account:")}
          <ul style={{ paddingLeft: "1.25rem" }}>
            {li("Your profile, messages, follows, and notifications are permanently deleted")}
            {li("Your wallet and transaction history are deleted")}
            {li("Rooms you hosted are removed or anonymised")}
            {li("Audio recordings you created are removed from storage")}
          </ul>
          {p("Some anonymised, aggregated data (e.g. session counts) may be retained for research and reporting purposes.")}
        </>)}

        {section("6. Security", <>
          {p("We implement industry-standard security measures including:")}
          <ul style={{ paddingLeft: "1.25rem" }}>
            {li("Row-level security on all database tables")}
            {li("Encrypted connections (HTTPS) for all data in transit")}
            {li("Phone-based authentication — no passwords stored in plaintext")}
            {li("Supabase Auth for secure session management")}
          </ul>
          {p("No system is perfectly secure. We will notify users promptly in the event of a data breach that affects their personal information.")}
        </>)}

        {section("7. Your Rights", <>
          {p("You have the right to:")}
          <ul style={{ paddingLeft: "1.25rem" }}>
            {li("Access the data we hold about you")}
            {li("Correct inaccurate information on your profile")}
            {li("Delete your account and all associated data")}
            {li("Object to any processing you did not consent to")}
            {li("Receive a copy of your data in a portable format")}
          </ul>
          {p("To exercise any of these rights, contact us at: privacy@dare.zw")}
        </>)}

        {section("8. Children", <>
          {p("Dare is not intended for use by anyone under the age of 16. We do not knowingly collect data from children. If we become aware that a child under 16 has created an account, we will delete it promptly.")}
        </>)}

        {section("9. Changes to This Policy", <>
          {p("We may update this policy as the platform evolves. We will notify users of material changes via an in-app notification or email. Continued use of Dare after a change constitutes acceptance of the updated policy.")}
        </>)}

        {section("10. Contact", <>
          {p("For privacy-related enquiries:")}
          <ul style={{ paddingLeft: "1.25rem" }}>
            {li("Email: privacy@dare.zw")}
            {li("Platform: dare-mini-mvp.vercel.app")}
            {li("Zimbabwe enquiries: compliance@dare.zw")}
          </ul>
        </>)}

        {/* Link to Terms */}
        <div style={{ marginTop: "3rem", padding: "1rem 1.25rem", background: "var(--bg2)", borderRadius: 10, border: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--text2)", fontFamily: "sans-serif" }}>Also read our Terms of Service</span>
          <button onClick={() => router.push("/terms")} style={{ background: "#D97706", color: "#fff", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" }}>
            View Terms →
          </button>
        </div>

      </div>
    </div>
  );
}
