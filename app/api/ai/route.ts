import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
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
        const msgText = messages
          .slice(-80) // last 80 messages max
          .map((m: { display_name: string; message: string }) => `${m.display_name}: ${m.message}`)
          .join("\n");
        prompt = `You are summarising a completed voice room session on Dare, a community platform in Zimbabwe.

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
        prompt = `You are a content moderator for Dare, a respectful community voice platform in Zimbabwe.

Review this chat message and respond with ONLY valid JSON:
{"safe": true/false, "reason": "brief reason if not safe"}

Message: "${message}"

Flag as unsafe ONLY if it contains:
- Explicit hate speech or slurs
- Direct threats of violence
- Sexual content
- Personal information (phone numbers, addresses)

Be permissive — community debate, disagreement, local slang, and strong opinions are fine.`;
        maxTokens = 80;
        break;
      }

      /* ── 4. AI host assistant ── */
      case "host_assist": {
        const { question, room_title, category } = payload;
        prompt = `You are an AI assistant helping a host respond to a question in a live Dare voice room in Zimbabwe.

Room: "${room_title}" (${category})
Listener's question: "${question}"

Suggest a helpful, concise response (1-3 sentences) the host could use.
Keep it conversational, community-focused, and relevant to the African context.
Return ONLY the suggested response text.`;
        maxTokens = 150;
        break;
      }

      /* ── 5. Recommended rooms ── */
      case "recommend_rooms": {
        const { user_type, followed_categories, recent_rooms, all_rooms } = payload;
        const roomList = all_rooms
          .map((r: { id: string; title: string; category: string; status: string; participant_count: number }) =>
            `[${r.id}] ${r.title} (${r.category}, ${r.status}, ${r.participant_count} listeners)`)
          .join("\n");
        prompt = `You are recommending rooms on Dare, a community voice platform in Zimbabwe.

User profile:
- Type: ${user_type}
- Followed categories: ${followed_categories.join(", ") || "none yet"}
- Recently visited rooms: ${recent_rooms.join(", ") || "none"}

Available rooms:
${roomList}

Return ONLY valid JSON array of up to 4 room IDs in order of relevance:
["id1", "id2", "id3", "id4"]

Prioritise: live rooms first, then category match, then diversity.`;
        maxTokens = 100;
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown feature" }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("");

    return NextResponse.json({ result: text.trim() });

  } catch (err) {
    console.error("AI route error:", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
