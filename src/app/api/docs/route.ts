import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

function auth() {
  const o = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, 'https://developers.google.com/oauthplayground');
  o.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return o;
}

export async function POST(req: NextRequest) {
  const { companyName, command, boardResult } = await req.json();
  const a = auth();
  const docs = google.docs({ version: 'v1', auth: a });
  const drive = google.drive({ version: 'v3', auth: a });

  const { data } = await docs.documents.create({ requestBody: { title: `${companyName} — AI Boardroom Report — ${new Date().toLocaleDateString('en-IN')}` } });
  const docId = data.documentId!;

  const fullText = [
    'VISHWAKARMA AI — BOARDROOM REPORT\n',
    `Company: ${companyName}\nDate: ${new Date().toLocaleDateString('en-IN')}\nCommand: ${command}\n\n`,
    'EXECUTIVE SUMMARY\n',
    boardResult.boardDecision + '\n\n',
    'FULL BOARD DISCUSSION\n',
    boardResult.discussion.map((m: { name: string; title: string; content: string }) => `${m.name} (${m.title})\n${m.content}`).join('\n\n---\n\n') + '\n\n',
    'UNANIMOUS BOARD DECISION\n',
    boardResult.actionItems.map((item: string, i: number) => `${i + 1}. ${item}`).join('\n') + '\n\n',
    'Powered by Vishwakarma AI — vishwakarmaai.com\n',
  ].join('');

  await docs.documents.batchUpdate({ documentId: docId, requestBody: { requests: [{ insertText: { location: { index: 1 }, text: fullText } }] } });
  await drive.permissions.create({ fileId: docId, requestBody: { role: 'reader', type: 'anyone' } });

  return NextResponse.json({ success: true, link: `https://docs.google.com/document/d/${docId}/edit` });
}