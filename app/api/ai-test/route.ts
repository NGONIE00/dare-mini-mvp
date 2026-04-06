import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "Say: Dare AI is working",
    });
    return NextResponse.json({ ok: true, response: response.text, keyPrefix: key.slice(0, 8) + "..." });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
      keyPrefix: key.slice(0, 8) + "...",
    }, { status: 500 });
  }
}
