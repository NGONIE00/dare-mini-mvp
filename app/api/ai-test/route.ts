import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    return NextResponse.json({ error: "GEMINI_API_KEY not set in environment" }, { status: 500 });
  }

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Say: Dare AI is working");
    const text = result.response.text();
    return NextResponse.json({ ok: true, response: text, keyPrefix: key.slice(0, 8) + "..." });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
      keyPrefix: key.slice(0, 8) + "...",
    }, { status: 500 });
  }
}
