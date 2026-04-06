import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

async function generate(prompt: string, maxTokens = 400): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");

  const ai = new GoogleGenAI({ apiKey: key });
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: { maxOutputTokens: maxTokens, temperature: 0.7 },
  });

  return (response.text ?? "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const { feature, payload } = await req.json();
    let result = "";

    if (feature === "room_description") {
      const { title, category, language } = payload as { title: string; category: string; language: string };
      result = await generate(
        `Write a 2-3 sentence room description for a community voice session on a platform for African communities.
Title: "${title}"
Category: ${category}
Language: ${language}
Requirements: warm tone, explain what listeners will learn, under 200 characters, no hashtags or emojis.
Return ONLY the description text, nothing else.`,
        120
      );
    }

    else if (feature === "room_summary") {
      const { title, messages, participant_count } = payload as {
        title: string;
        messages: Array<{ display_name: string; message: string }>;
        participant_count: number;
      };
      const transcript = messages.slice(-60).map(m => `${m.display_name}: ${m.message}`).join("\n");
      result = await generate(
        `Summarise this completed community voice session in 3-5 sentences.
Room: "${title}" — ${participant_count} participants
Transcript:
${transcript}
Cover: main topics, key insights, community value. Warm, informative tone.
Return ONLY the summary.`,
        250
      );
    }

    else if (feature === "moderate_message") {
      const { message } = payload as { message: string };
      result = await generate(
        `Review this chat message and return ONLY valid JSON with no markdown or backticks:
{"safe": true, "reason": ""}

Message: "${message}"

Only flag as unsafe for: explicit hate speech, direct threats of violence, sexual content, or personal contact info.
Community debate, strong opinions, and local slang are fine.
Return ONLY the JSON object, nothing else.`,
        60
      );
    }

    else if (feature === "host_assist") {
      const { question, room_title, category } = payload as { question: string; room_title: string; category: string };
      result = await generate(
        `You are helping a host in a live community voice room respond to a listener's question.
Room: "${room_title}" (${category})
Question: "${question}"
Write a helpful 1-3 sentence response. Conversational, community-focused.
Return ONLY the response text, nothing else.`,
        150
      );
    }

    else if (feature === "recommend_rooms") {
      const { user_type, followed_categories, recent_rooms, all_rooms } = payload as {
        user_type: string;
        followed_categories: string[];
        recent_rooms: string[];
        all_rooms: Array<{ id: string; title: string; category: string; status: string; participant_count: number }>;
      };
      const list = all_rooms.map(r => `[${r.id}] ${r.title} (${r.category}, ${r.status}, ${r.participant_count} listeners)`).join("\n");
      result = await generate(
        `Recommend rooms for a ${user_type} on a community voice platform.
Followed categories: ${followed_categories.join(", ") || "none"}
Recent rooms: ${recent_rooms.join(", ") || "none"}
Available rooms:
${list}
Return ONLY a JSON array of up to 4 room IDs with no markdown or backticks:
["id1","id2"]
Prioritise: live rooms first, then category match.`,
        100
      );
    }

    else {
      return NextResponse.json({ error: "Unknown feature" }, { status: 400 });
    }

    return NextResponse.json({ result });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("AI route error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
