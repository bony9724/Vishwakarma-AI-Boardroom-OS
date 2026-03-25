import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuthClient } from '@/lib/google-auth';

interface Lead {
  name: string; company: string; role: string;
  email: string; linkedin: string; reason: string;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  try {
    const { leads, companyName, industry, boardDecision } = await req.json();
    if (!leads || leads.length === 0) return NextResponse.json({ error: 'No leads' }, { status: 400 });

    const auth = await getAuthClient();
    const gmail = google.gmail({ version: 'v1', auth });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const senderEmail = profile.data.emailAddress || '';
    const results: { email: string; status: string }[] = [];

    for (const lead of leads as Lead[]) {
      const firstName = lead.name.split(' ')[0];
      const subject = `Partnership Opportunity — ${companyName} × ${lead.company}`;
      const body = `Dear ${firstName},

I hope this message finds you well.

My name is Deepak Joshi, VP Sales at ${companyName}. I came across your profile and ${lead.company}'s work in the ${industry} space and I believe there is a strong alignment between what we do and what you are building.

Our board recently made a strategic decision: ${boardDecision.slice(0, 180)}

Given your role as ${lead.role} at ${lead.company}, I believe ${companyName} can directly help you. ${lead.reason}

I would love to schedule a 20-minute discovery call this week to explore how we can create value together.

Are you available for a quick call on Thursday or Friday?

Warm regards,
Deepak Joshi
VP Sales — ${companyName}

---
Sent autonomously by Vishwakarma AI Boardroom OS
World's First Multi-Agent AI Boardroom System — vishwakarmaai.com`;

      const message = [
        `From: ${senderEmail}`,
        `To: ${lead.email}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/plain; charset=utf-8`,
        ``,
        body,
      ].join('\r\n');

      const raw = Buffer.from(message).toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      try {
        await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
        results.push({ email: lead.email, status: 'sent' });
        await sleep(600);
      } catch (e) {
        results.push({ email: lead.email, status: 'error' });
      }
    }

    const sent = results.filter(r => r.status === 'sent').length;
    return NextResponse.json({ success: true, sent, total: leads.length, results });
  } catch (error) {
    console.error('Cold email error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
