import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userTokens = cookieStore.get("user_google_tokens");

    const connected = userTokens ? true : false;

    return NextResponse.json({ connected });
  } catch (error: any) {
    return NextResponse.json({ connected: false, error: error.message });
  }
}