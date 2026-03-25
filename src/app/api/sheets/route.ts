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
    console.warn('Sheets: could not read user token from cookie, falling back to owner token');
  }
  return await getAuthClient();
}

export async function POST(req: NextRequest) {
  try {
    const { companyName, command, email, userEmail, boardResult } = await req.json();
    const recipientEmail = userEmail || email;

    const auth = await getAuth(req);
    const sheets = google.sheets({ version: 'v4', auth });
    const drive  = google.drive({ version: 'v3', auth });

    const today = new Date().toLocaleDateString('en-IN');

    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: `${companyName} — Vishwakarma AI Boardroom — ${today}` },
        sheets: [{ properties: { title: 'Board Actions' } }],
      },
    });

    const sheetId = spreadsheet.data.spreadsheetId!;

    const rows = [
      ['DATE', 'COMPANY', 'COMMAND', 'BOARD DECISION', 'ACTION ITEMS'],
      [
        today,
        companyName || '',
        command || '',
        boardResult?.boardDecision || '',
        boardResult?.actionItems?.join(' | ') || '',
      ],
    ];

    if (boardResult?.discussion) {
      rows.push(['', '', '', '', '']);
      rows.push(['EXECUTIVE', 'TITLE', 'KEY POINTS', '', '']);
      for (const exec of boardResult.discussion) {
        rows.push([exec.name, exec.title, exec.content.slice(0, 300), '', '']);
      }
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Board Actions!A1',
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    });

    let sharingError: string | null = null;
    console.log('Sheets: sharing to email:', recipientEmail, '| sheetId:', sheetId);
    if (recipientEmail) {
      try {
        await drive.permissions.create({
          fileId: sheetId,
          requestBody: { role: 'writer', type: 'user', emailAddress: recipientEmail },
          sendNotificationEmail: false,
          fields: 'id',
        });
        console.log('Sheets: share success for', recipientEmail);
      } catch (e) {
        sharingError = String(e);
        console.error('Sheets share error:', sharingError);
      }
    } else {
      console.warn('Sheets: no email in request body — skipping share');
    }

    const link = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
    return NextResponse.json({ success: true, link, ...(sharingError && { sharingError }) });
  } catch (error) {
    console.error('Sheets error:', String(error));
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}