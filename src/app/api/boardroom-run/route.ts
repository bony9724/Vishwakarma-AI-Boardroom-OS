import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, company, industry, challenge } = body;

    const agents = ['ceo', 'cmo', 'cfo', 'coo', 'cto', 'hr', 'vp-sales'];
    const results: Record<string, any> = {};

    for (const agent of agents) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://vishwakarma-ai-boardroom-os.vercel.app';
        const res = await fetch(`${baseUrl}/api/${agent}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: req.headers.get('cookie') || '' },
          body: JSON.stringify({ email, company, industry, challenge }),
        });
        const data = await res.json();
        results[agent] = data;
        console.log(`Agent ${agent}: ${data.success ? 'SUCCESS' : 'FAILED'}`);
      } catch (err: any) {
        results[agent] = { success: false, error: err.message };
      }
    }

    const allSuccess = Object.values(results).every((r: any) => r.success);
    return NextResponse.json({ success: allSuccess, results });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}