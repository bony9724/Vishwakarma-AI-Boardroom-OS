import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ disconnected: true });
  const expired = { maxAge: 0, httpOnly: true, secure: true, sameSite: "lax" as const };
  response.cookies.set("g_refresh_token", "", expired);
  response.cookies.set("g_access_token",  "", expired);
  response.cookies.set("g_user_email",    "", expired);
  return response;
}
