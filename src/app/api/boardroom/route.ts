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
      max_tokens: 600,
      system: `You are an AI executive in the Vishwakarma AI Boardroom Operating System — the world's first AI OS for Indian companies.

CRITICAL RULES:
1. Always directly address and reference what previous executives said
2. Use specific numbers, percentages, and ₹ amounts
3. Give autonomous, concrete decisions — not suggestions
4. Be goal-oriented and action-focused
5. Write in first person as the executive
6. India market context always
7. Maximum 280 words per response
8. End with a clear handoff to the next executive
9. Never be generic — be specific to the company and industry given`,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("");

    return NextResponse.json({ text });
  } catch (err) {
    console.error("Claude API error:", err);
    return NextResponse.json({ error: "Claude API error" }, { status: 500 });
  }
}
