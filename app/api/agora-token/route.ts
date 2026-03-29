import { NextRequest, NextResponse } from "next/server";
import { RtcTokenBuilder, RtcRole } from "agora-token";

export async function POST(req: NextRequest) {
  try {
    const { channelName, uid } = await req.json();

    if (!channelName || uid === undefined) {
      return NextResponse.json({ error: "channelName and uid required" }, { status: 400 });
    }

    const appId          = process.env.NEXT_PUBLIC_AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      return NextResponse.json({ error: "Agora credentials not configured" }, { status: 500 });
    }

    const expireSeconds       = 3600; // 1 hour
    const currentTimestamp    = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTimestamp + expireSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      privilegeExpireTime,
      privilegeExpireTime,
    );

    return NextResponse.json({ token, uid });
  } catch (err) {
    console.error("Agora token error:", err);
    return NextResponse.json({ error: "Token generation failed" }, { status: 500 });
  }
}
