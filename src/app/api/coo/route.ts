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
      messages: [{ role: 'user', content: `You are Ravi Krishnan, COO of ${company} in the ${industry} industry.
The company is facing this challenge: ${challenge}

Build a complete 90-day operational execution plan:
Month 1 (Days 1 to 30) Foundation Phase: 5 specific tasks, each with owner role, deadline, and success metric
Month 2 (Days 31 to 60) Growth Phase: 5 specific tasks, each with owner role, deadline, and success metric
Month 3 (Days 61 to 90) Scale Phase: 5 specific tasks, each with owner role, deadline, and success metric
This week standup focus: 3 daily discussion items
Vendor or partner to onboard this month: 1 recommendation with reason

Plain English only. No asterisks. No markdown. No bold. Raw text only.` }]
    });

    const output = (response.content[0] as any).text;
    const subject = `COO Report — ${company} — ${new Date().toDateString()}`;
    const body = `From the desk of Ravi Krishnan, COO\n\n${output}\n\n— Ravi Krishnan, COO, ${company}`;

    await sendEmail(auth, email, subject, body);
    const docLink = await saveToDoc(auth, subject, body);

    return NextResponse.json({ success: true, agent: 'COO', output, docLink });
  } catch (err: any) {
    console.error('COO agent error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}