"use client";
import { useRouter } from "next/navigation";

export default function TermsOfService() {
  const router = useRouter();

  const section = (title: string, children: React.ReactNode) => (
    <div style={{ marginBottom: "2.5rem" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", fontFamily: "sans-serif", marginBottom: "0.75rem", paddingBottom: "0.5rem", borderBottom: "0.5px solid var(--border)" }}>{title}</h2>
      <div style={{ fontSize: "0.85rem", color: "var(--text2)", fontFamily: "sans-serif", lineHeight: 1.8 }}>
        {children}
      </div>
    </div>
  );

  const p = (text: string) => <p style={{ margin: "0 0 0.75rem" }}>{text}</p>;
  const li = (text: string) => <li style={{ marginBottom: "0.4rem" }}>{text}</li>;

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
          <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2rem)", fontWeight: 800, color: "var(--text)", marginBottom: "0.5rem", fontFamily: "sans-serif" }}>Terms of Service</h1>
          <p style={{ fontSize: "0.82rem", color: "var(--text3)", fontFamily: "sans-serif" }}>
            Effective date: 7 April 2026 · Last updated: 7 April 2026
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--text2)", fontFamily: "sans-serif", lineHeight: 1.7, marginTop: "1rem", padding: "1rem", background: "var(--bg2)", borderRadius: 8, border: "0.5px solid var(--border)" }}>
            These Terms of Service govern your use of Dare — The Digital Council (&quot;Dare&quot;, &quot;the platform&quot;), operated at dare-mini-mvp.vercel.app. By creating an account or using Dare, you agree to these terms. If you do not agree, do not use the platform.
          </p>
        </div>

        {section("1. The Platform", <>
          {p("Dare is a digital voice platform that enables communities to host, join, and sustain live voice conversations. It is designed for inclusive participation across diverse devices and network conditions.")}
          {p("Dare is currently in prototype stage and is provided for community use and grant evaluation purposes. Features may change as the platform evolves.")}
        </>)}

        {section("2. Eligibility", <>
          {p("To use Dare, you must:")}
          <ul style={{ paddingLeft: "1.25rem" }}>
            {li("Be at least 16 years of age")}
            {li("Provide a valid phone number for account creation")}
            {li("Have the legal capacity to enter into these terms")}
            {li("Not be prohibited from using the service under applicable laws")}
          </ul>
        </>)}

        {section("3. Your Account", <>
          {p("You are responsible for your account and all activity under it.")}
          <ul style={{ paddingLeft: "1.25rem" }}>
            {li("Keep your access credentials secure")}
            {li("Notify us immediately of any unauthorised use of your account")}
            {li("Use an accurate display name — impersonation of others is prohibited")}
            {li("You may have one account per phone number")}
          </ul>
          {p("We reserve the right to suspend or terminate accounts that violate these terms.")}
        </>)}

        {section("4. Acceptable Use", <>
          {p("When using Dare, you agree not to:")}
          <ul style={{ paddingLeft: "1.25rem" }}>
            {li("Post or broadcast hate speech, harassment, or content that incites violence")}
            {li("Share illegal content or content that violates the rights of others")}
            {li("Distribute spam, misinformation, or deliberately misleading content")}
            {li("Attempt to access other users' accounts or private data")}
            {li("Use automated tools to scrape, bulk-message, or overload the platform")}
            {li("Impersonate Dare staff, other users, or public figures")}
            {li("Use the platform for unlicensed commercial broadcasting or fundraising")}
          </ul>
          {p("Dare uses AI-assisted content moderation. Flagged content may be reviewed by platform administrators.")}
        </>)}

        {section("5. Host Responsibilities", <>
          {p("If you create and host rooms on Dare, you are responsible for:")}
          <ul style={{ paddingLeft: "1.25rem" }}>
            {li("The accuracy and legality of content shared in your rooms")}
            {li("Moderating your room appropriately and maintaining a respectful environment")}
            {li("Ensuring any ticketed sessions deliver the described content")}
            {li("Any claims, costs, or damages arising from your hosted sessions")}
          </ul>
          {p("Dare provides moderation tools but does not pre-screen all room content.")}
        </>)}

        {section("6. Payments and Earnings", <>
          {p("Dare facilitates payments between listeners and hosts via mobile money services.")}
          <ul style={{ paddingLeft: "1.25rem" }}>
            {li("Approximately 85% of each payment goes directly to the host")}
            {li("Platform fees are deducted automatically at the time of transaction")}
            {li("Payments are processed via third-party mobile money providers (EcoCash, Mukuru, OneMoney, M-Pesa)")}
            {li("Dare is not responsible for payment failures caused by third-party providers")}
            {li("Refunds for ticketed sessions are at the host's discretion")}
          </ul>
          {p("Earnings are credited to your Dare wallet and may be withdrawn subject to minimum withdrawal thresholds. Revenue figures shown in the dashboard are estimates until formally reconciled.")}
        </>)}

        {section("7. Intellectual Property", <>
          {p("Content you create on Dare — including your profile, room descriptions, and messages — remains yours. By posting content on Dare, you grant us a limited, non-exclusive licence to display and deliver that content to other users on the platform.")}
          {p("The Dare name, logo, interface design, and underlying technology are owned by the platform and may not be reproduced without permission.")}
        </>)}

        {section("8. Session Recordings", <>
          {p("If you enable session recording as a host:")}
          <ul style={{ paddingLeft: "1.25rem" }}>
            {li("You are responsible for obtaining consent from all participants")}
            {li("Recordings are stored securely and accessible to room participants after the session ends")}
            {li("Dare does not use recordings for training AI models or advertising")}
            {li("You may delete your recordings at any time by deleting the room")}
          </ul>
        </>)}

        {section("9. AI Features", <>
          {p("Dare uses AI (powered by Google Gemini) to assist with room descriptions, content moderation, session summaries, and host assistance. These features are:")}
          <ul style={{ paddingLeft: "1.25rem" }}>
            {li("Assistive — not authoritative. AI outputs should be reviewed before use")}
            {li("Not a substitute for human judgement in moderation decisions")}
            {li("Subject to the terms and limitations of the underlying AI provider")}
          </ul>
        </>)}

        {section("10. Availability and Modifications", <>
          {p("Dare is provided on an as-is basis during the prototype stage. We do not guarantee:")}
          <ul style={{ paddingLeft: "1.25rem" }}>
            {li("Uninterrupted or error-free service")}
            {li("That all features will remain available")}
            {li("Specific uptime or response time")}
          </ul>
          {p("We reserve the right to modify, suspend, or discontinue any feature with reasonable notice.")}
        </>)}

        {section("11. Limitation of Liability", <>
          {p("To the extent permitted by applicable law, Dare is not liable for:")}
          <ul style={{ paddingLeft: "1.25rem" }}>
            {li("Indirect, incidental, or consequential damages arising from your use of the platform")}
            {li("Loss of data, revenue, or reputation resulting from platform issues")}
            {li("Actions or content produced by other users")}
            {li("Failures of third-party services including payment providers and voice infrastructure")}
          </ul>
          {p("Our total liability to you in any circumstances shall not exceed the amount you paid to use the platform in the preceding 12 months.")}
        </>)}

        {section("12. Governing Law", <>
          {p("These terms are governed by the laws of Zimbabwe. Any disputes shall be subject to the jurisdiction of the courts of Zimbabwe, without prejudice to any mandatory consumer protection rights you may have under local law.")}
        </>)}

        {section("13. Changes to These Terms", <>
          {p("We may update these terms as the platform develops. Material changes will be communicated via in-app notification at least 14 days before taking effect. Your continued use of Dare after the effective date constitutes acceptance.")}
        </>)}

        {section("14. Contact", <>
          {p("For terms-related enquiries:")}
          <ul style={{ paddingLeft: "1.25rem" }}>
            {li("Email: legal@dare.zw")}
            {li("Platform: dare-mini-mvp.vercel.app")}
            {li("Zimbabwe enquiries: compliance@dare.zw")}
          </ul>
        </>)}

        {/* Link to Privacy */}
        <div style={{ marginTop: "3rem", padding: "1rem 1.25rem", background: "var(--bg2)", borderRadius: 10, border: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--text2)", fontFamily: "sans-serif" }}>Also read our Privacy Policy</span>
          <button onClick={() => router.push("/privacy")} style={{ background: "#D97706", color: "#fff", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", fontFamily: "sans-serif" }}>
            View Privacy Policy →
          </button>
        </div>

      </div>
    </div>
  );
}
