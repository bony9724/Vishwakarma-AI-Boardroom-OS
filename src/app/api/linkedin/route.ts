import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { companyName, boardDecision } = await req.json();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Write a viral LinkedIn post for ${companyName} based on this AI boardroom decision: "${String(boardDecision).slice(0, 300)}"
Format: Hook line, 3-4 value points, call to action, 5 hashtags.
Max 150 words. India startup context. Use moderate emojis.
Return only the post text, nothing else.`,
        }],
      }),
    });

    const data = await response.json();
    const post = data.content[0].text;

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error('LinkedIn error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}