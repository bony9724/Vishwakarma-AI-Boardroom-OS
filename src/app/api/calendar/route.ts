import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuthClient } from '@/lib/google-auth';

export async function POST(req: NextRequest) {
  try {
    const { companyName, command, email, boardResult } = await req.json();
    const auth = await getAuthClient();
    const cal = google.calendar({ version: 'v3', auth });

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const endTime = new Date(tomorrow);
    endTime.setHours(11, 0, 0, 0);

    const event = await cal.events.insert({
      calendarId: 'primary',
      sendNotifications: true,
      sendUpdates: 'all',
      conferenceDataVersion: 1,
      requestBody: {
        summary: `${companyName} — Vishwakarma AI Strategy Meeting`,
        description: `AI Boardroom Strategy Meeting\n\nCompany: ${companyName}\nCommand: ${command}\n\nBOARD DECISION:\n${boardResult?.boardDecision || ''}\n\nACTION ITEMS:\n${boardResult?.actionItems?.map((item: string, i: number) => `${i + 1}. ${item}`).join('\n') || ''}\n\nPowered by Vishwakarma AI`,
        start: { dateTime: tomorrow.toISOString(), timeZone: 'Asia/Kolkata' },
        end: { dateTime: endTime.toISOString(), timeZone: 'Asia/Kolkata' },
        attendees: [{ email: email || process.env.GOOGLE_USER_EMAIL || 'anubhabr97@gmail.com' }],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 30 },
            { method: 'popup', minutes: 10 },
          ],
        },
        conferenceData: {
          createRequest: {
            requestId: `vishwakarma-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      eventId: event.data.id,
      link: event.data.htmlLink,
      meetLink: event.data.conferenceData?.entryPoints?.[0]?.uri || '',
      start: event.data.start?.dateTime,
    });
  } catch (error: unknown) {
    console.error('Calendar error:', JSON.stringify(error));
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
