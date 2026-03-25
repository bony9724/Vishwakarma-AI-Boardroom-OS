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
    const invoiceRef = `INV-${company.substring(0,3).toUpperCase()}-${Date.now().toString().slice(-6)}`;

    const response = await ai.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: `You are Vikram Nair, CFO of ${company} in the ${industry} industry.
The company is facing this challenge: ${challenge}
Auto-generated invoice reference: ${invoiceRef}

Generate a complete financial report:
1. Financial health summary (3 key metrics in plain text)
2. Top 3 cost areas to monitor this week with amounts in Indian Rupees
3. Revenue opportunity from solving this challenge (estimate in lakhs)
4. Invoice ${invoiceRef} — describe what service or product it covers
5. Cash flow recommendation for next 30 days
6. One financial risk and exact mitigation steps

Plain English only. No asterisks. No markdown. No bold. Raw text only.` }]
    });

    const output = (response.content[0] as any).text;
    const subject = `CFO Report — ${company} — ${new Date().toDateString()}`;
    const body = `From the desk of Vikram Nair, CFO\n\n${output}\n\n— Vikram Nair, CFO, ${company}`;

    await sendEmail(auth, email, subject, body);
    const docLink = await saveToDoc(auth, subject, body);

    return NextResponse.json({ success: true, agent: 'CFO', output, docLink });
  } catch (err: any) {
    console.error('CFO agent error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}