import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const connected = !!(
      cookieStore.get("g_refresh_token")?.value ||
      cookieStore.get("g_access_token")?.value
    );
    const email = cookieStore.get("g_user_email")?.value || null;
    return NextResponse.json({ connected, email });
  } catch (error: any) {
    return NextResponse.json({ connected: false, error: error.message });
  }
}
