import { NextRequest, NextResponse } from "next/server";
import { getRecentSessions, getRecentDecisions, getMemoryContext, saveUserPref } from "@/lib/memory";

export async function GET() {
  try {
    const sessions = getRecentSessions(10);
    const decisions = getRecentDecisions(10);
    const context = getMemoryContext();
    return NextResponse.json({ status: "ok", sessions, decisions, context });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, value } = body;
    saveUserPref(key, value);
    return NextResponse.json({ status: "ok", message: "Preference saved" });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}