import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { google } from 'googleapis';

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

function getOAuthClient(tokens: any) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2.setCredentials(tokens);
  return oauth2;
}

async function getUserTokens(req: NextRequest) {
  const tokenCookie = req.cookies.get('user_google_tokens')?.value;
  return tokenCookie ? JSON.parse(tokenCookie) : JSON.parse(process.env.GOOGLE_TOKENS!);
}

async function sendEmail(auth: any, to: string, subject: string, body: string) {
  const gmail = google.gmail({ version: 'v1', auth });
  const raw = Buffer.from(
    `To: ${to}\nSubject: ${subject}\nContent-Type: text/plain; charset=utf-8\n\n${body}`
  ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
}

async function saveToDoc(auth: any, title: string, body: string) {
  const docs = google.docs({ version: 'v1', auth });
  const drive = google.drive({ version: 'v3', auth });
  const doc = await docs.documents.create({ requestBody: { title } });
  const docId = doc.data.documentId!;
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { requests: [{ insertText: { location: { index: 1 }, text: body } }] }
  });
  await drive.permissions.create({ fileId: docId, requestBody: { role: 'reader', type: 'anyone' } });
  return `https://docs.google.com/document/d/${docId}`;
}

export async function POST(req: NextRequest) {
  try {
    const { email, company, industry, challenge } = await req.json();
    const tokens = await getUserTokens(req);
    const auth = getOAuthClient(tokens);

    const response = await ai.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: `You are Kavitha Reddy, HR Head of ${company} in the ${industry} industry.
The company is facing this challenge: ${challenge}

Generate a complete HR and hiring plan:
1. Top 3 roles to hire for immediately — each with: job title, salary range in lakhs per year, top 3 must-have skills
2. Full job description for the most critical role (150 words)
3. Interview process — 3 rounds with format and what each round assesses
4. 5-item onboarding checklist for the first hire's Day 1
5. One company culture value ${company} must protect during growth
6. Retention tip: one thing to do this month to keep current team motivated

Plain English only. No asterisks. No markdown. No bold. Raw text only.` }]
    });

    const output = (response.content[0] as any).text;
    const subject = `HR Head Report — ${company} — ${new Date().toDateString()}`;
    const body = `From the desk of Kavitha Reddy, HR Head\n\n${output}\n\n— Kavitha Reddy, HR Head, ${company}`;

    await sendEmail(auth, email, subject, body);
    const docLink = await saveToDoc(auth, subject, body);

    return NextResponse.json({ success: true, agent: 'HR', output, docLink });
  } catch (err: any) {
    console.error('HR agent error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}