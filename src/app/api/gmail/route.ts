import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

function auth() {
  const o = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  o.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return o;
}

export async function POST(req: NextRequest) {
  try {
    const { companyName, command, email, boardResult } = await req.json();
    const gmail = google.gmail({ version: 'v1', auth: auth() });
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const body = `BOARDROOM MEETING REPORT
Company: ${companyName}
Date: ${today}
Command: ${command}
Status: EXECUTED BY VISHWAKARMA AI

EXECUTIVE SUMMARY
${boardResult.boardDecision}

BOARD DISCUSSION
${boardResult.discussion.map((m: { name: string; title: string; content: string }) => `${m.name} (${m.title}):\n${m.content.slice(0, 300)}...`).join('\n\n')}

UNANIMOUS BOARD DECISION
${boardResult.actionItems.map((item: string, i: number) => `${i + 1}. ${item}`).join('\n')}

Powered by Vishwakarma AI — vishwakarmaai.com`;

    const to = email || process.env.GOOGLE_USER_EMAIL!;
    const subject = `${companyName} AI Boardroom Report — ${today}`;
    
    const message = [
      `From: ${process.env.GOOGLE_USER_EMAIL}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      body
    ].join('\r\n');

    const raw = Buffer.from(message).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
    
    return NextResponse.json({ success: true, message: `Email sent to ${to}` });
  } catch (error: unknown) {
    console.error('Gmail error:', JSON.stringify(error));
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}