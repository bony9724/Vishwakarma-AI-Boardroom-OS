import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuthClient } from '@/lib/google-auth';
import { OAuth2Client } from 'google-auth-library';

async function getAuth(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/user_google_tokens=([^;]+)/);
    if (match) {
      const tokens = JSON.parse(decodeURIComponent(match[1]));
      if (tokens?.access_token || tokens?.refresh_token) {
        const oauth2Client = new OAuth2Client(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials(tokens);
        return oauth2Client;
      }
    }
  } catch (e) {
    console.warn('Docs: could not read user token from cookie, falling back to owner token');
  }
  return await getAuthClient();
}

export async function POST(req: NextRequest) {
  try {
    const { companyName, command, email, userEmail, boardResult } = await req.json();
    const recipientEmail = userEmail || email;

    const auth = await getAuth(req);
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

    let sharingError: string | null = null;
    console.log('Docs: sharing to email:', recipientEmail, '| docId:', docId);
    if (recipientEmail) {
      try {
        await drive.permissions.create({
          fileId: docId,
          requestBody: { role: 'writer', type: 'user', emailAddress: recipientEmail },
          sendNotificationEmail: false,
          fields: 'id',
        });
        console.log('Docs: share success for', recipientEmail);
      } catch (e) {
        sharingError = String(e);
        console.error('Docs share error:', sharingError);
      }
    } else {
      console.warn('Docs: no email in request body — skipping share');
    }

    const documentUrl = `https://docs.google.com/document/d/${docId}/edit`;
    return NextResponse.json({ success: true, documentUrl, ...(sharingError && { sharingError }) });
  } catch (error: unknown) {
    console.error('Docs error:', String(error));
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}