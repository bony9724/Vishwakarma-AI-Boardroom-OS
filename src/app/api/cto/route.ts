import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

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

    const system = 'You are Rahul Gupta, CTO. Plain English only. No asterisks. No markdown. No bold. Raw text only.';
    const userMessage = `You are Rahul Gupta, CTO of ${company} in the ${industry} industry.
The company is facing this challenge: ${challenge}

Generate a complete technical execution plan:
1. Eight GitHub-style issues — each with: Issue title, Priority (High/Medium/Low), Effort (S/M/L), one-line description
2. Recommended tech stack — 5 specific tools or services with brief reason for each
3. System architecture recommendation — 3 sentences describing the ideal setup
4. Biggest technical risk and step-by-step mitigation
5. One technical debt item to fix this sprint

Plain English only. No asterisks. No markdown. No bold. Raw text only.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet',
        max_tokens: 1200,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMessage }
        ],
      }),
    });
    const data = await response.json();
    const output = data.choices[0].message.content;

    const subject = `CTO Report — ${company} — ${new Date().toDateString()}`;
    const body = `From the desk of Rahul Gupta, CTO\n\n${output}\n\n— Rahul Gupta, CTO, ${company}`;

    await sendEmail(auth, email, subject, body);
    const docLink = await saveToDoc(auth, subject, body);

    return NextResponse.json({ success: true, agent: 'CTO', output, docLink });
  } catch (err: any) {
    console.error('CTO agent error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
