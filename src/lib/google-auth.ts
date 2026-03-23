import { google } from 'googleapis';
import { cookies } from 'next/headers';

export async function getAuthClient() {
  const cookieStore = await cookies();

  const refreshToken = cookieStore.get('g_refresh_token')?.value || process.env.GOOGLE_REFRESH_TOKEN;
  const accessToken = cookieStore.get('g_access_token')?.value;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const credentials: { refresh_token?: string; access_token?: string } = {};
  if (refreshToken) credentials.refresh_token = refreshToken;
  if (accessToken) credentials.access_token = accessToken;

  oauth2Client.setCredentials(credentials);
  return oauth2Client;
}
