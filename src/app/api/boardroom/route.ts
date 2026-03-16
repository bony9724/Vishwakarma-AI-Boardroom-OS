import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      system: "You are an AI executive in the Vishwakarma AI Boardroom Operating System for Indian startups. Speak with authority and precision. Always include one specific metric or number. End with one concrete action item. Max 4 sentences. India-market context.",
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
    return NextResponse.json({ text });
  } catch (err) {
    console.error("Claude API error:", err);
    return NextResponse.json({ error: "Claude API error" }, { status: 500 });
  }
}