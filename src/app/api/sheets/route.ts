import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuthClient } from '@/lib/google-auth';

export async function POST(req: NextRequest) {
  try {
    const { companyName, command, boardResult } = await req.json();
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

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

    const link = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
    return NextResponse.json({ success: true, link });
  } catch (error) {
    console.error('Sheets error:', String(error));
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
