import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { industry, company } = await req.json();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Generate 10 realistic Indian business leads for a ${industry} company called ${company}.
Return ONLY a JSON array. No markdown, no explanation, no backticks.
Each item must have: name, company, role, email, linkedin, reason.
Generate 10 leads now:`,
        }],
      }),
    });

    const data = await response.json();
    const text = data.content[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    const match = clean.match(/\[[\s\S]*\]/);
    const leads = match ? JSON.parse(match[0]) : [];

    return NextResponse.json({ success: true, leads });
  } catch (error) {
    console.error('Leads error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}