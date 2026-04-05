import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

async function generate(prompt: string, maxTokens = 400): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.7,
    },
  });
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

export async function POST(req: NextRequest) {
  try {
    // Verify API key is present
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set");
      return NextResponse.json({ error: "AI not configured — GEMINI_API_KEY missing" }, { status: 500 });
    }

    const { feature, payload } = await req.json();

    let prompt = "";
    let maxTokens = 400;

    switch (feature) {

      /* ── 1. Smart room description ── */
      case "room_description": {
        const { title, category, language } = payload;
        prompt = `You are helping a community host on Dare — a voice platform for low-bandwidth users in Zimbabwe and Africa.

Write a compelling 2-3 sentence room description for this session:
Title: "${title}"
Category: ${category}
Language: ${language}

Requirements:
- Warm, community-focused tone
- Mention what listeners will learn or experience
- Under 200 characters
- No hashtags or emojis
- Relevant to African community context

Return ONLY the description text, nothing else.`;
        maxTokens = 120;
        break;
      }

      /* ── 2. Room summary ── */
      case "room_summary": {
        const { title, messages, participant_count } = payload;
        const msgText = (messages as Array<{ display_name: string; message: string }>)
          .slice(-80)
          .map(m => `${m.display_name}: ${m.message}`)
          .join("\n");
        prompt = `You are summarising a completed voice room session on Dare, a community platform.

Room: "${title}"
Participants: ${participant_count}
Chat transcript:
${msgText}

Write a brief, warm summary (3-5 sentences) covering:
1. Main topics discussed
2. Key insights or decisions shared
3. Community value delivered

Tone: informative, community-focused, celebratory of knowledge shared.
Return ONLY the summary text.`;
        maxTokens = 250;
        break;
      }

      /* ── 3. Content moderation ── */
      case "moderate_message": {
        const { message } = payload;
        prompt = `You are a content moderator for Dare, a respectful community voice platform.

Review this chat message and respond with ONLY valid JSON (no markdown, no backticks):
{"safe": true, "reason": ""}

Or if unsafe:
{"safe": false, "reason": "brief reason"}

Message: "${message}"

Flag as unsafe ONLY if it contains:
- Explicit hate speech or slurs
- Direct threats of violence
- Sexual content
- Personal information (phone numbers, addresses)

Be permissive — community debate, disagreement, local slang, and strong opinions are fine.
Return ONLY the JSON object.`;
        maxTokens = 80;
        break;
      }

      /* ── 4. AI host assistant ── */
      case "host_assist": {
        const { question, room_title, category } = payload;
        prompt = `You are an AI assistant helping a host respond to a question in a live Dare voice room.

Room: "${room_title}" (${category})
Listener's question: "${question}"

Suggest a helpful, concise response (1-3 sentences) the host could use.
Keep it conversational, community-focused, and relevant to the African context.
Return ONLY the suggested response text, nothing else.`;
        maxTokens = 150;
        break;
      }

      /* ── 5. Recommended rooms ── */
      case "recommend_rooms": {
        const { user_type, followed_categories, recent_rooms, all_rooms } = payload;
        const roomList = (all_rooms as Array<{ id: string; title: string; category: string; status: string; participant_count: number }>)
          .map(r => `[${r.id}] ${r.title} (${r.category}, ${r.status}, ${r.participant_count} listeners)`)
          .join("\n");
        prompt = `You are recommending rooms on Dare, a community voice platform.

User profile:
- Type: ${user_type}
- Followed categories: ${(followed_categories as string[]).join(", ") || "none yet"}
- Recently visited rooms: ${(recent_rooms as string[]).join(", ") || "none"}

Available rooms:
${roomList}

Return ONLY a valid JSON array of up to 4 room IDs in order of relevance (no markdown, no backticks):
["id1", "id2", "id3", "id4"]

Prioritise: live rooms first, then category match, then diversity.`;
        maxTokens = 100;
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown feature" }, { status: 400 });
    }

    const result = await generate(prompt, maxTokens);
    return NextResponse.json({ result });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Gemini AI route error:", msg);
    return NextResponse.json({ error: `AI request failed: ${msg}` }, { status: 500 });
  }
}
