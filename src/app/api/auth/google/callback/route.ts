import { google } from "googleapis";
import { NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://vishwakarma-ai-boardroom-os.vercel.app";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return NextResponse.redirect(`${APP_URL}?error=no_code`);
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch user email
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    const response = NextResponse.redirect(APP_URL);

    if (tokens.refresh_token) {
      response.cookies.set("g_refresh_token", tokens.refresh_token, COOKIE_OPTIONS);
    }
    if (tokens.access_token) {
      response.cookies.set("g_access_token", tokens.access_token, COOKIE_OPTIONS);
    }
    if (userInfo.email) {
      response.cookies.set("g_user_email", userInfo.email, COOKIE_OPTIONS);
    }

    return response;
  } catch (error: any) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(`${APP_URL}?error=oauth_failed`);
  }
}
