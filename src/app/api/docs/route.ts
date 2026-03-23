import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuthClient } from '@/lib/google-auth';

export async function POST(req: NextRequest) {
  try {
    const { companyName, command, email, boardResult } = await req.json();
    const auth = await getAuthClient();
    const docs = google.docs({ version: 'v1', auth });
    const drive = google.drive({ version: 'v3', auth });

    const { data } = await docs.documents.create({
      requestBody: { title: `${companyName} — AI Boardroom Report — ${new Date().toLocaleDateString('en-IN')}` },
    });
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

    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests: [{ insertText: { location: { index: 1 }, text: fullText } }] },
    });
    await drive.permissions.create({ fileId: docId, requestBody: { role: 'reader', type: 'anyone' } });
    if (email) {
      await drive.permissions.create({ fileId: docId, requestBody: { role: 'writer', type: 'user', emailAddress: email } });
    }

    const documentUrl = `https://docs.google.com/document/d/${docId}/edit`;
    return NextResponse.json({ success: true, documentUrl });
  } catch (error: unknown) {
    console.error('Docs error:', String(error));
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
