/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         VISHWAKARMA AI — COMPLETE MASTER BUILD               ║
 * ║         World's First Multi-Agent AI Boardroom OS            ║
 * ║         Built by Anubhab Roy, Agartala, Tripura, India       ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * DROP THIS FILE IN: C:\Users\digit\Documents\vishwakarma-boardroom\
 * THEN RUN IN VS CODE TERMINAL:
 *
 *   node vishwakarma-master-build.js
 *   git add .
 *   git commit -m "Vishwakarma AI v4 — Complete Historic Vision"
 *   git push
 *
 * WHAT THIS BUILDS:
 *   ✅ Historic Digital Human with voice command interaction
 *   ✅ CEO  — Arjun Mehta   → Strategic memo + Google Doc
 *   ✅ CMO  — Priya Sharma  → LinkedIn + Twitter + Content Calendar
 *   ✅ CFO  — Vikram Nair   → Financial report + Invoice
 *   ✅ COO  — Ravi Krishnan → 90-day execution plan
 *   ✅ CTO  — Rahul Gupta   → GitHub issues + Tech architecture
 *   ✅ HR   — Kavitha Reddy → Hiring plan + Job descriptions
 *   ✅ VP Sales — Deepak Joshi → Cold emails to 10 leads (already built)
 *   ALL emails → user's form email. ALL docs → user's Google Drive.
 */

const fs = require('fs');
const path = require('path');

const BASE_API = path.join(__dirname, 'src', 'app', 'api');
const BASE_APP = path.join(__dirname, 'src', 'app');

// ═══════════════════════════════════════════════════════════════
// HELPER — write file, create dirs automatically
// ═══════════════════════════════════════════════════════════════
function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✅ ${filePath.replace(__dirname, '').replace(/\\/g, '/')}`);
}

// ═══════════════════════════════════════════════════════════════
// SHARED OAUTH HELPER — used in all agent routes
// ═══════════════════════════════════════════════════════════════
const OAUTH_HELPER = `
function getOAuthClient(tokens: any) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2.setCredentials(tokens);
  return oauth2;
}

async function getUserTokens(req: NextRequest) {
  const tokenCookie = req.cookies.get('user_google_tokens')?.value;
  return tokenCookie ? JSON.parse(tokenCookie) : JSON.parse(process.env.GOOGLE_TOKENS!);
}

async function sendEmail(auth: any, to: string, subject: string, body: string) {
  const gmail = google.gmail({ version: 'v1', auth });
  const raw = Buffer.from(
    \`To: \${to}\\nSubject: \${subject}\\nContent-Type: text/plain; charset=utf-8\\n\\n\${body}\`
  ).toString('base64').replace(/\\+/g, '-').replace(/\\//g, '_');
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
}

async function saveToDoc(auth: any, title: string, body: string) {
  const docs = google.docs({ version: 'v1', auth });
  const drive = google.drive({ version: 'v3', auth });
  const doc = await docs.documents.create({ requestBody: { title } });
  const docId = doc.data.documentId!;
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { requests: [{ insertText: { location: { index: 1 }, text: body } }] }
  });
  await drive.permissions.create({ fileId: docId, requestBody: { role: 'reader', type: 'anyone' } });
  return \`https://docs.google.com/document/d/\${docId}\`;
}
`;

// ═══════════════════════════════════════════════════════════════
// AGENT ROUTE FACTORY
// ═══════════════════════════════════════════════════════════════
function makeRoute(agentKey, agentName, agentTitle, prompt, extraLogic = '') {
  return `import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { google } from 'googleapis';

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
${OAUTH_HELPER}
export async function POST(req: NextRequest) {
  try {
    const { email, company, industry, challenge } = await req.json();
    const tokens = await getUserTokens(req);
    const auth = getOAuthClient(tokens);
${extraLogic}
    const response = await ai.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: \`${prompt}\` }]
    });

    const output = (response.content[0] as any).text;
    const subject = \`${agentTitle} Report — \${company} — \${new Date().toDateString()}\`;
    const body = \`From the desk of ${agentName}, ${agentTitle}\\n\\n\${output}\\n\\n— ${agentName}, ${agentTitle}, \${company}\`;

    await sendEmail(auth, email, subject, body);
    const docLink = await saveToDoc(auth, subject, body);

    return NextResponse.json({ success: true, agent: '${agentKey.toUpperCase()}', output, docLink });
  } catch (err: any) {
    console.error('${agentKey.toUpperCase()} agent error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}`;
}

// ═══════════════════════════════════════════════════════════════
// 1. CEO ROUTE
// ═══════════════════════════════════════════════════════════════
console.log('\n🔱 Building CEO Agent...');
write(
  path.join(BASE_API, 'ceo', 'route.ts'),
  makeRoute(
    'ceo', 'Arjun Mehta', 'CEO',
    `You are Arjun Mehta, CEO of \${company} in the \${industry} industry.
The company is facing this challenge: \${challenge}

Write a strategic morning memo for the full leadership team.
Include:
1. Top 3 priorities for the week with clear owners
2. One critical decision the team must make today
3. One risk to watch and how to handle it
4. Motivational closing statement for the team
5. CEO direct action: one thing YOU will personally do today

Plain English only. No asterisks. No markdown. No bold. Raw text only. Max 350 words.`
  )
);

// ═══════════════════════════════════════════════════════════════
// 2. CMO ROUTE
// ═══════════════════════════════════════════════════════════════
console.log('\n🔱 Building CMO Agent...');
write(
  path.join(BASE_API, 'cmo', 'route.ts'),
  makeRoute(
    'cmo', 'Priya Sharma', 'CMO',
    `You are Priya Sharma, CMO of \${company} in the \${industry} industry.
The company is facing this challenge: \${challenge}

Generate a complete content marketing execution package:
1. LinkedIn post (150 words, professional tone, ends with 3 relevant hashtags)
2. Twitter/X thread (5 tweets, punchy and engaging, each under 280 characters, numbered 1/5 to 5/5)
3. This week content calendar (Monday to Friday, one clear topic per day)
4. One growth hack to implement this week
5. Email subject line for the weekly newsletter

Plain English only. No asterisks. No markdown. No bold. Raw text only.`
  )
);

// ═══════════════════════════════════════════════════════════════
// 3. CFO ROUTE
// ═══════════════════════════════════════════════════════════════
console.log('\n🔱 Building CFO Agent...');
write(
  path.join(BASE_API, 'cfo', 'route.ts'),
  makeRoute(
    'cfo', 'Vikram Nair', 'CFO',
    `You are Vikram Nair, CFO of \${company} in the \${industry} industry.
The company is facing this challenge: \${challenge}
Auto-generated invoice reference: \${invoiceRef}

Generate a complete financial report:
1. Financial health summary (3 key metrics in plain text)
2. Top 3 cost areas to monitor this week with amounts in Indian Rupees
3. Revenue opportunity from solving this challenge (estimate in lakhs)
4. Invoice \${invoiceRef} — describe what service or product it covers
5. Cash flow recommendation for next 30 days
6. One financial risk and exact mitigation steps

Plain English only. No asterisks. No markdown. No bold. Raw text only.`,
    `    const invoiceRef = \`INV-\${company.substring(0,3).toUpperCase()}-\${Date.now().toString().slice(-6)}\`;\n`
  )
);

// ═══════════════════════════════════════════════════════════════
// 4. COO ROUTE
// ═══════════════════════════════════════════════════════════════
console.log('\n🔱 Building COO Agent...');
write(
  path.join(BASE_API, 'coo', 'route.ts'),
  makeRoute(
    'coo', 'Ravi Krishnan', 'COO',
    `You are Ravi Krishnan, COO of \${company} in the \${industry} industry.
The company is facing this challenge: \${challenge}

Build a complete 90-day operational execution plan:
Month 1 (Days 1 to 30) Foundation Phase: 5 specific tasks, each with owner role, deadline, and success metric
Month 2 (Days 31 to 60) Growth Phase: 5 specific tasks, each with owner role, deadline, and success metric
Month 3 (Days 61 to 90) Scale Phase: 5 specific tasks, each with owner role, deadline, and success metric
This week standup focus: 3 daily discussion items
Vendor or partner to onboard this month: 1 recommendation with reason

Plain English only. No asterisks. No markdown. No bold. Raw text only.`
  )
);

// ═══════════════════════════════════════════════════════════════
// 5. CTO ROUTE
// ═══════════════════════════════════════════════════════════════
console.log('\n🔱 Building CTO Agent...');
write(
  path.join(BASE_API, 'cto', 'route.ts'),
  makeRoute(
    'cto', 'Rahul Gupta', 'CTO',
    `You are Rahul Gupta, CTO of \${company} in the \${industry} industry.
The company is facing this challenge: \${challenge}

Generate a complete technical execution plan:
1. Eight GitHub-style issues — each with: Issue title, Priority (High/Medium/Low), Effort (S/M/L), one-line description
2. Recommended tech stack — 5 specific tools or services with brief reason for each
3. System architecture recommendation — 3 sentences describing the ideal setup
4. Biggest technical risk and step-by-step mitigation
5. One technical debt item to fix this sprint

Plain English only. No asterisks. No markdown. No bold. Raw text only.`
  )
);

// ═══════════════════════════════════════════════════════════════
// 6. HR ROUTE
// ═══════════════════════════════════════════════════════════════
console.log('\n🔱 Building HR Agent...');
write(
  path.join(BASE_API, 'hr', 'route.ts'),
  makeRoute(
    'hr', 'Kavitha Reddy', 'HR Head',
    `You are Kavitha Reddy, HR Head of \${company} in the \${industry} industry.
The company is facing this challenge: \${challenge}

Generate a complete HR and hiring plan:
1. Top 3 roles to hire for immediately — each with: job title, salary range in lakhs per year, top 3 must-have skills
2. Full job description for the most critical role (150 words)
3. Interview process — 3 rounds with format and what each round assesses
4. 5-item onboarding checklist for the first hire's Day 1
5. One company culture value \${company} must protect during growth
6. Retention tip: one thing to do this month to keep current team motivated

Plain English only. No asterisks. No markdown. No bold. Raw text only.`
  )
);

// ═══════════════════════════════════════════════════════════════
// 7. BOARDROOM ORCHESTRATOR ROUTE
//    Calls all 6 agents sequentially after VP Sales
// ═══════════════════════════════════════════════════════════════
console.log('\n🔱 Building Boardroom Orchestrator...');
write(
  path.join(BASE_API, 'boardroom-run', 'route.ts'),
  `import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, company, industry, challenge } = body;

    const agents = ['ceo', 'cmo', 'cfo', 'coo', 'cto', 'hr', 'vp-sales'];
    const results: Record<string, any> = {};

    for (const agent of agents) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://vishwakarma-ai-boardroom-os.vercel.app';
        const res = await fetch(\`\${baseUrl}/api/\${agent}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: req.headers.get('cookie') || '' },
          body: JSON.stringify({ email, company, industry, challenge }),
        });
        const data = await res.json();
        results[agent] = data;
        console.log(\`Agent \${agent}: \${data.success ? 'SUCCESS' : 'FAILED'}\`);
      } catch (err: any) {
        results[agent] = { success: false, error: err.message };
      }
    }

    const allSuccess = Object.values(results).every((r: any) => r.success);
    return NextResponse.json({ success: allSuccess, results });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}`
);

// ═══════════════════════════════════════════════════════════════
// 8. HISTORIC DIGITAL HUMAN PAGE — FULL VISION
// ═══════════════════════════════════════════════════════════════
console.log('\n🔱 Building Historic Digital Human + Voice Command UI...');
write(
  path.join(BASE_APP, 'page.tsx'),
  `'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

// ─── TYPES ───────────────────────────────────────────────────
interface AgentResult {
  agent: string;
  success: boolean;
  output?: string;
  docLink?: string;
  error?: string;
}

interface BoardroomState {
  phase: 'idle' | 'listening' | 'processing' | 'running' | 'done';
  step: number;
  company: string;
  industry: string;
  challenge: string;
  email: string;
  results: AgentResult[];
  currentAgent: string;
  log: string[];
}

// ─── AGENT CONFIG ────────────────────────────────────────────
const AGENTS = [
  { key: 'ceo',      name: 'Arjun Mehta',    title: 'CEO',      color: '#FFD700', emoji: '👔' },
  { key: 'cmo',      name: 'Priya Sharma',   title: 'CMO',      color: '#FF6B9D', emoji: '📢' },
  { key: 'cfo',      name: 'Vikram Nair',    title: 'CFO',      color: '#00D4AA', emoji: '💰' },
  { key: 'coo',      name: 'Ravi Krishnan',  title: 'COO',      color: '#4ECDC4', emoji: '⚙️' },
  { key: 'cto',      name: 'Rahul Gupta',    title: 'CTO',      color: '#7B68EE', emoji: '💻' },
  { key: 'hr',       name: 'Kavitha Reddy',  title: 'HR',       color: '#FF8C42', emoji: '👥' },
  { key: 'vp-sales', name: 'Deepak Joshi',   title: 'VP Sales', color: '#32CD32', emoji: '🎯' },
];

// ─── SPEECH UTILS ────────────────────────────────────────────
function speak(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.92;
  u.pitch = 1.05;
  u.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel'));
  if (preferred) u.voice = preferred;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
}

// ─── HOLOGRAPHIC FACE ────────────────────────────────────────
function HolographicFace({ phase, speaking }: { phase: string; speaking: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width = 340;
    const H = canvas.height = 340;
    const cx = W / 2, cy = H / 2;

    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

    function draw(t: number) {
      ctx.clearRect(0, 0, W, H);
      const isSpeaking = speaking;
      const isRunning = phase === 'running';
      const pulse = Math.sin(t * 0.04) * 0.5 + 0.5;
      const fastPulse = Math.sin(t * 0.12) * 0.5 + 0.5;
      const microMove = Math.sin(t * 0.02) * 2;
      const microMoveY = Math.cos(t * 0.015) * 1.5;

      // ── Outer rings ──────────────────────────────────────
      for (let i = 3; i >= 1; i--) {
        const r = 140 + i * 18 + (isSpeaking ? fastPulse * 12 : pulse * 6);
        const alpha = isSpeaking ? 0.15 + fastPulse * 0.2 : 0.08 + pulse * 0.06;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = \`rgba(0,212,255,\${alpha})\`;
        ctx.lineWidth = isSpeaking ? 2 : 1;
        ctx.stroke();
      }

      // ── Rotating hex grid lines ───────────────────────────
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.003);
      for (let a = 0; a < 6; a++) {
        const angle = (a / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * 160, Math.sin(angle) * 160);
        ctx.strokeStyle = \`rgba(0,212,255,\${0.04 + pulse * 0.04})\`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();

      // ── Neural particle dots ─────────────────────────────
      for (let i = 0; i < (isSpeaking ? 24 : 14); i++) {
        const angle = (i / (isSpeaking ? 24 : 14)) * Math.PI * 2 + t * 0.008;
        const r = isSpeaking ? 118 + Math.sin(t * 0.1 + i) * 20 : 108 + Math.sin(t * 0.05 + i) * 8;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        const brightness = 0.4 + Math.sin(t * 0.08 + i * 0.8) * 0.4;
        ctx.beginPath();
        ctx.arc(px, py, isSpeaking ? 3 : 2, 0, Math.PI * 2);
        ctx.fillStyle = \`rgba(0,212,255,\${brightness})\`;
        ctx.fill();
      }

      // ── Face base ─────────────────────────────────────────
      const faceGrad = ctx.createRadialGradient(cx + microMove, cy + microMoveY, 10, cx, cy, 110);
      faceGrad.addColorStop(0, 'rgba(0,40,80,0.98)');
      faceGrad.addColorStop(0.6, 'rgba(0,20,50,0.97)');
      faceGrad.addColorStop(1, 'rgba(0,8,24,0.95)');
      ctx.beginPath();
      ctx.ellipse(cx + microMove, cy + microMoveY, 100, 118, 0, 0, Math.PI * 2);
      ctx.fillStyle = faceGrad;
      ctx.fill();
      ctx.strokeStyle = \`rgba(0,212,255,\${0.5 + pulse * 0.3})\`;
      ctx.lineWidth = isSpeaking ? 2.5 : 1.5;
      ctx.stroke();

      // ── Scan line ─────────────────────────────────────────
      const scanY = cy - 100 + ((t * (isSpeaking ? 3 : 1.5)) % 220);
      const scanGrad = ctx.createLinearGradient(cx - 100, scanY, cx + 100, scanY);
      scanGrad.addColorStop(0, 'transparent');
      scanGrad.addColorStop(0.5, \`rgba(0,212,255,\${isSpeaking ? 0.5 : 0.2})\`);
      scanGrad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.moveTo(cx - 100, scanY);
      ctx.lineTo(cx + 100, scanY);
      ctx.strokeStyle = scanGrad;
      ctx.lineWidth = isSpeaking ? 2 : 1;
      ctx.stroke();

      // ── Eyes ──────────────────────────────────────────────
      const eyeY = cy - 22 + microMoveY;
      const eyeScanX = Math.sin(t * 0.025) * 12;
      const eyeScanY = Math.cos(t * 0.018) * 6;

      [cx - 30, cx + 30].forEach((ex, idx) => {
        // Eye glow
        const eyeGlow = ctx.createRadialGradient(ex + microMove, eyeY, 1, ex + microMove, eyeY, 18);
        eyeGlow.addColorStop(0, \`rgba(0,212,255,\${isSpeaking ? 0.5 + fastPulse * 0.4 : 0.2 + pulse * 0.2})\`);
        eyeGlow.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(ex + microMove, eyeY, 18, 0, Math.PI * 2);
        ctx.fillStyle = eyeGlow;
        ctx.fill();

        // Eyelid shape
        ctx.beginPath();
        ctx.ellipse(ex + microMove, eyeY, 14, isSpeaking ? 11 : 9, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,8,30,0.9)';
        ctx.fill();
        ctx.strokeStyle = \`rgba(0,212,255,\${0.8 + pulse * 0.2})\`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Pupil tracking
        const pupilX = ex + microMove + eyeScanX * (idx === 0 ? 1 : 1);
        const pupilY = eyeY + eyeScanY;
        ctx.beginPath();
        ctx.arc(pupilX, pupilY, 5, 0, Math.PI * 2);
        ctx.fillStyle = isSpeaking ? \`rgba(0,255,200,\${0.7 + fastPulse * 0.3})\` : 'rgba(0,212,255,0.9)';
        ctx.fill();

        // Specular reflection
        ctx.beginPath();
        ctx.arc(pupilX - 2, pupilY - 2, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fill();
      });

      // ── Eyebrows ──────────────────────────────────────────
      const browRaise = isSpeaking ? Math.sin(t * 0.06) * 4 : 0;
      [[cx - 30, cx - 14], [cx + 14, cx + 30]].forEach(([bx1, bx2], idx) => {
        const by = cy - 44 + microMoveY - browRaise;
        ctx.beginPath();
        ctx.moveTo(bx1 + microMove, by + (idx === 0 ? 2 : -2));
        ctx.lineTo(bx2 + microMove, by + (idx === 0 ? -2 : 2));
        ctx.strokeStyle = \`rgba(0,212,255,\${0.6 + pulse * 0.3})\`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      });

      // ── Nose bridge ───────────────────────────────────────
      ctx.beginPath();
      ctx.moveTo(cx + microMove, cy - 5 + microMoveY);
      ctx.quadraticCurveTo(cx - 6 + microMove, cy + 8 + microMoveY, cx - 4 + microMove, cy + 14 + microMoveY);
      ctx.moveTo(cx + microMove, cy - 5 + microMoveY);
      ctx.quadraticCurveTo(cx + 6 + microMove, cy + 8 + microMoveY, cx + 4 + microMove, cy + 14 + microMoveY);
      ctx.strokeStyle = \`rgba(0,180,220,0.4)\`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // ── Mouth ─────────────────────────────────────────────
      const mouthY = cy + 44 + microMoveY;
      const mouthOpen = isSpeaking ? 4 + Math.sin(t * 0.15) * 7 : 1;
      const mouthWidth = 24;

      // Mouth glow
      if (isSpeaking) {
        const mGlow = ctx.createRadialGradient(cx + microMove, mouthY, 1, cx + microMove, mouthY, 20);
        mGlow.addColorStop(0, \`rgba(0,255,200,\${fastPulse * 0.4})\`);
        mGlow.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(cx + microMove, mouthY, 20, 0, Math.PI * 2);
        ctx.fillStyle = mGlow;
        ctx.fill();
      }

      // Upper lip
      ctx.beginPath();
      ctx.moveTo(cx - mouthWidth + microMove, mouthY);
      ctx.quadraticCurveTo(cx + microMove, mouthY - 4, cx + mouthWidth + microMove, mouthY);
      ctx.strokeStyle = \`rgba(0,212,255,\${0.8 + pulse * 0.2})\`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Lower lip
      ctx.beginPath();
      ctx.moveTo(cx - mouthWidth + microMove, mouthY);
      ctx.quadraticCurveTo(cx + microMove, mouthY + mouthOpen * 2, cx + mouthWidth + microMove, mouthY);
      ctx.strokeStyle = \`rgba(0,212,255,0.8)\`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Mouth interior
      if (mouthOpen > 2) {
        ctx.beginPath();
        ctx.ellipse(cx + microMove, mouthY + mouthOpen * 0.5, mouthWidth * 0.7, mouthOpen, 0, 0, Math.PI * 2);
        ctx.fillStyle = \`rgba(0,255,200,\${mouthOpen / 20})\`;
        ctx.fill();
      }

      // ── Data lines on face ────────────────────────────────
      if (isRunning || isSpeaking) {
        for (let dl = 0; dl < 3; dl++) {
          const dlY = cy - 60 + dl * 40 + microMoveY;
          const dlAlpha = 0.1 + Math.sin(t * 0.05 + dl * 2) * 0.08;
          ctx.beginPath();
          ctx.moveTo(cx - 85 + microMove, dlY);
          ctx.lineTo(cx + 85 + microMove, dlY);
          ctx.strokeStyle = \`rgba(0,212,255,\${dlAlpha})\`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // ── Cheekbone highlights ──────────────────────────────
      [cx - 70, cx + 70].forEach(chX => {
        const chGrad = ctx.createRadialGradient(chX + microMove, cy + 10 + microMoveY, 0, chX + microMove, cy + 10 + microMoveY, 22);
        chGrad.addColorStop(0, \`rgba(0,212,255,\${0.12 + pulse * 0.06})\`);
        chGrad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(chX + microMove, cy + 10 + microMoveY, 22, 0, Math.PI * 2);
        ctx.fillStyle = chGrad;
        ctx.fill();
      });

      // ── VISHWAKARMA text ──────────────────────────────────
      ctx.font = '700 11px monospace';
      ctx.fillStyle = \`rgba(0,212,255,\${0.4 + pulse * 0.2})\`;
      ctx.textAlign = 'center';
      ctx.fillText('VISHWAKARMA AI', cx, cy + 84 + microMoveY);
      ctx.font = '500 9px monospace';
      ctx.fillStyle = \`rgba(0,212,255,0.3)\`;
      ctx.fillText('BOARDROOM OS v4.0', cx, cy + 98 + microMoveY);
    }

    function loop() {
      timeRef.current++;
      draw(timeRef.current);
      animRef.current = requestAnimationFrame(loop);
    }
    loop();
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, speaking]);

  return (
    <div style={{ position: 'relative', width: 340, height: 340 }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'radial-gradient(ellipse at center, rgba(0,40,80,0.3) 0%, rgba(0,212,255,0.05) 70%, transparent 100%)',
        filter: speaking ? 'blur(8px)' : 'blur(4px)',
        transform: speaking ? 'scale(1.15)' : 'scale(1.05)',
        transition: 'all 0.5s ease',
      }} />
      <canvas ref={canvasRef} style={{ position: 'relative', zIndex: 1 }} />
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function Home() {
  const [state, setState] = useState<BoardroomState>({
    phase: 'idle',
    step: 0,
    company: '',
    industry: '',
    challenge: '',
    email: '',
    results: [],
    currentAgent: '',
    log: [],
  });
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceStep, setVoiceStep] = useState(0);
  const recognitionRef = useRef<any>(null);

  // Speak with face animation
  const sayAndAnimate = useCallback((text: string, onEnd?: () => void) => {
    setSpeaking(true);
    speak(text, () => {
      setSpeaking(false);
      if (onEnd) onEnd();
    });
  }, []);

  // Start voice interaction
  const startVoiceInteraction = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recognition not supported. Please use Chrome browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';
    recognitionRef.current = recognition;

    const steps = [
      { prompt: 'Namaste. I am Vishwakarma AI. Please tell me your company name.', field: 'company' },
      { prompt: 'Got it. Now tell me your industry. For example: technology, retail, healthcare.', field: 'industry' },
      { prompt: 'Understood. Now describe your biggest business challenge right now.', field: 'challenge' },
      { prompt: 'Perfect. Finally, tell me your email address so I can send all reports.', field: 'email' },
    ];

    let currentStep = voiceStep;

    const listenForInput = (stepIndex: number) => {
      if (stepIndex >= steps.length) {
        sayAndAnimate('Excellent. Your boardroom is assembling now. Seven AI executives are preparing your company strategy.', () => {
          setState(prev => ({ ...prev, phase: 'running' }));
        });
        return;
      }

      const step = steps[stepIndex];
      sayAndAnimate(step.prompt, () => {
        setListening(true);
        recognition.start();
        recognition.onresult = (event: any) => {
          const heard = event.results[0][0].transcript;
          setListening(false);
          setState(prev => ({ ...prev, [step.field]: heard }));

          let confirm = '';
          if (step.field === 'company') confirm = \`Great. Your company is \${heard}.\`;
          else if (step.field === 'industry') confirm = \`Perfect. Industry: \${heard}.\`;
          else if (step.field === 'challenge') confirm = \`I understand. Challenge noted.\`;
          else if (step.field === 'email') confirm = \`Got it. I will send all reports to \${heard}.\`;

          currentStep = stepIndex + 1;
          setVoiceStep(currentStep);
          sayAndAnimate(confirm, () => listenForInput(currentStep));
        };
        recognition.onerror = () => {
          setListening(false);
          sayAndAnimate('Sorry, I did not catch that. Please try again.', () => listenForInput(stepIndex));
        };
      });
    };

    setState(prev => ({ ...prev, phase: 'listening' }));
    listenForInput(currentStep);
  }, [voiceStep, sayAndAnimate]);

  // Run all agents
  useEffect(() => {
    if (state.phase !== 'running') return;
    if (!state.email || !state.company) return;

    const runAgents = async () => {
      const log: string[] = [];
      const results: AgentResult[] = [];

      for (const agent of AGENTS) {
        setState(prev => ({ ...prev, currentAgent: agent.key, log: [...prev.log, \`Running \${agent.title}...\`] }));
        sayAndAnimate(\`\${agent.name}, \${agent.title}, is now executing tasks for \${state.company}.\`);

        try {
          const res = await fetch(\`/api/\${agent.key}\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: state.email,
              company: state.company,
              industry: state.industry,
              challenge: state.challenge,
            }),
          });
          const data = await res.json();
          results.push({ agent: agent.key, success: data.success, output: data.output, docLink: data.docLink, error: data.error });
          log.push(\`\${agent.title}: \${data.success ? '✅ Done — ' + (data.docLink || '') : '❌ ' + data.error}\`);
          setState(prev => ({ ...prev, results: [...results], log: [...log] }));

          // Wait for speech to finish before next agent
          await new Promise(resolve => setTimeout(resolve, 3500));
        } catch (err: any) {
          results.push({ agent: agent.key, success: false, error: err.message });
          log.push(\`\${agent.title}: ❌ \${err.message}\`);
          setState(prev => ({ ...prev, results: [...results], log: [...log] }));
        }
      }

      setState(prev => ({ ...prev, phase: 'done', currentAgent: '' }));
      sayAndAnimate(
        \`Boardroom complete. All seven executives have executed their tasks for \${state.company}. Check your email for all reports.\`
      );
    };

    runAgents();
  }, [state.phase]);

  const resetAll = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setListening(false);
    setVoiceStep(0);
    setState({ phase: 'idle', step: 0, company: '', industry: '', challenge: '', email: '', results: [], currentAgent: '', log: [] });
  };

  // ─── RENDER ────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, #001830 0%, #000810 60%, #000000 100%)',
      color: '#e0f0ff',
      fontFamily: "'Courier New', monospace",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '32px 16px',
    }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: 6, color: '#00d4ff', opacity: 0.6, marginBottom: 8 }}>
          WORLD'S FIRST
        </div>
        <h1 style={{
          fontSize: 'clamp(20px, 4vw, 32px)',
          fontWeight: 900,
          letterSpacing: 3,
          background: 'linear-gradient(135deg, #00d4ff 0%, #ffffff 50%, #00d4ff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0,
        }}>
          VISHWAKARMA AI BOARDROOM OS
        </h1>
        <div style={{ fontSize: 11, letterSpacing: 4, color: '#00d4ff', opacity: 0.5, marginTop: 6 }}>
          MULTI-AGENT AUTONOMOUS COMPANY OPERATING SYSTEM
        </div>
      </div>

      {/* Digital Human */}
      <div style={{ marginBottom: 28, position: 'relative' }}>
        <HolographicFace phase={state.phase} speaking={speaking} />
        {listening && (
          <div style={{
            position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(255,60,60,0.2)', border: '1px solid rgba(255,60,60,0.6)',
            borderRadius: 20, padding: '4px 16px', fontSize: 11, color: '#ff6060',
            animation: 'pulse 1s infinite',
          }}>
            🎤 LISTENING...
          </div>
        )}
        {speaking && (
          <div style={{
            position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.4)',
            borderRadius: 20, padding: '4px 16px', fontSize: 11, color: '#00d4ff',
          }}>
            ◉ SPEAKING
          </div>
        )}
      </div>

      {/* IDLE — Start Options */}
      {state.phase === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 480 }}>
          <button
            onClick={startVoiceInteraction}
            style={{
              width: '100%', padding: '18px 24px',
              background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,100,180,0.2))',
              border: '1px solid rgba(0,212,255,0.5)', borderRadius: 12,
              color: '#00d4ff', fontSize: 15, fontWeight: 700, letterSpacing: 2,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontFamily: 'inherit',
            }}
          >
            🎤 SPEAK TO VISHWAKARMA AI
          </button>

          <div style={{ color: '#00d4ff', opacity: 0.4, fontSize: 11, letterSpacing: 3 }}>— OR TYPE BELOW —</div>

          <input placeholder="Company name" value={state.company}
            onChange={e => setState(p => ({ ...p, company: e.target.value }))}
            style={inputStyle} />
          <input placeholder="Industry (e.g. Technology, Retail)" value={state.industry}
            onChange={e => setState(p => ({ ...p, industry: e.target.value }))}
            style={inputStyle} />
          <textarea placeholder="Your biggest business challenge right now..." value={state.challenge}
            onChange={e => setState(p => ({ ...p, challenge: e.target.value }))}
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} />
          <input placeholder="Your email address" value={state.email} type="email"
            onChange={e => setState(p => ({ ...p, email: e.target.value }))}
            style={inputStyle} />

          <button
            onClick={() => {
              if (!state.company || !state.email || !state.challenge) {
                alert('Please fill company name, challenge, and email.');
                return;
              }
              setState(p => ({ ...p, phase: 'running' }));
            }}
            style={{
              width: '100%', padding: '18px 24px',
              background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(200,150,0,0.2))',
              border: '1px solid rgba(255,215,0,0.5)', borderRadius: 12,
              color: '#FFD700', fontSize: 15, fontWeight: 700, letterSpacing: 2,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            🔱 INITIATE BOARDROOM
          </button>
        </div>
      )}

      {/* LISTENING / PROCESSING */}
      {(state.phase === 'listening') && (
        <div style={{ textAlign: 'center', color: '#00d4ff', fontSize: 14, letterSpacing: 2 }}>
          {state.company && <div>Company: <strong>{state.company}</strong></div>}
          {state.industry && <div>Industry: <strong>{state.industry}</strong></div>}
          {state.challenge && <div>Challenge: <strong>{state.challenge.substring(0, 60)}...</strong></div>}
        </div>
      )}

      {/* RUNNING */}
      {state.phase === 'running' && (
        <div style={{ width: '100%', maxWidth: 560 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: '#FFD700', letterSpacing: 3, marginBottom: 4 }}>
              ⚡ BOARDROOM EXECUTING
            </div>
            <div style={{ fontSize: 11, color: '#00d4ff', opacity: 0.6 }}>
              {state.company} · {state.industry}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {AGENTS.map(agent => {
              const result = state.results.find(r => r.agent === agent.key);
              const isActive = state.currentAgent === agent.key;
              return (
                <div key={agent.key} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 10,
                  background: isActive
                    ? \`rgba(\${hexToRgb(agent.color)},0.15)\`
                    : result?.success ? 'rgba(0,255,100,0.05)' : 'rgba(255,255,255,0.03)',
                  border: \`1px solid \${isActive ? agent.color : result?.success ? 'rgba(0,255,100,0.3)' : 'rgba(255,255,255,0.08)'}\`,
                  transition: 'all 0.4s ease',
                }}>
                  <span style={{ fontSize: 20 }}>{agent.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? agent.color : '#e0f0ff' }}>
                      {agent.name} · {agent.title}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                      {isActive ? '⚡ Executing...' : result ? (result.success ? '✅ Complete' : '❌ Failed') : 'Waiting...'}
                    </div>
                  </div>
                  {result?.docLink && (
                    <a href={result.docLink} target="_blank" rel="noreferrer"
                      style={{ fontSize: 10, color: '#00d4ff', textDecoration: 'underline' }}>
                      View Doc
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DONE */}
      {state.phase === 'done' && (
        <div style={{ width: '100%', maxWidth: 560 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 22, color: '#FFD700', letterSpacing: 3, marginBottom: 6 }}>
              🔱 BOARDROOM COMPLETE
            </div>
            <div style={{ fontSize: 12, color: '#00d4ff', opacity: 0.7 }}>
              {state.company} is now running autonomously · Check {state.email}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {state.results.map(r => {
              const agent = AGENTS.find(a => a.key === r.agent)!;
              return (
                <div key={r.agent} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px', borderRadius: 8,
                  background: r.success ? 'rgba(0,255,100,0.05)' : 'rgba(255,60,60,0.05)',
                  border: \`1px solid \${r.success ? 'rgba(0,255,100,0.25)' : 'rgba(255,60,60,0.25)'}\`,
                }}>
                  <span>{agent?.emoji}</span>
                  <div style={{ flex: 1, fontSize: 12 }}>
                    {agent?.name} · {agent?.title}
                    {r.success ? ' — ✅ Emails sent + Doc saved' : \` — ❌ \${r.error}\`}
                  </div>
                  {r.docLink && (
                    <a href={r.docLink} target="_blank" rel="noreferrer"
                      style={{ fontSize: 10, color: '#00d4ff', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
                      Open Doc →
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={resetAll} style={{
            width: '100%', padding: '14px', background: 'rgba(0,212,255,0.1)',
            border: '1px solid rgba(0,212,255,0.4)', borderRadius: 10,
            color: '#00d4ff', fontSize: 13, fontWeight: 700, letterSpacing: 2,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            ↺ RUN AGAIN FOR ANOTHER COMPANY
          </button>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 40, textAlign: 'center', opacity: 0.3, fontSize: 10, letterSpacing: 2 }}>
        INVENTED BY ANUBHAB ROY · AGARTALA, TRIPURA, INDIA · AGE 28 · ZERO CODING BACKGROUND<br />
        BUILDING FROM HOME · NO TEAM · NO OFFICE · NO INVESTORS · CHANGING THE WORLD 🔱🇮🇳
      </div>

      <style>{\`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        input:focus, textarea:focus { outline: none; border-color: rgba(0,212,255,0.7) !important; }
        * { box-sizing: border-box; }
      \`}</style>
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px',
  background: 'rgba(0,212,255,0.05)',
  border: '1px solid rgba(0,212,255,0.25)',
  borderRadius: 8, color: '#e0f0ff', fontSize: 13,
  fontFamily: "'Courier New', monospace",
};

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return \`\${r},\${g},\${b}\`;
}
`
);

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════
console.log('\n');
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║   🔱 VISHWAKARMA AI — COMPLETE BUILD DONE                    ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log('║   Files created:                                             ║');
console.log('║   ✅ src/app/page.tsx        — Historic Digital Human        ║');
console.log('║   ✅ src/app/api/ceo/        — CEO Agent (Arjun Mehta)       ║');
console.log('║   ✅ src/app/api/cmo/        — CMO Agent (Priya Sharma)      ║');
console.log('║   ✅ src/app/api/cfo/        — CFO Agent (Vikram Nair)       ║');
console.log('║   ✅ src/app/api/coo/        — COO Agent (Ravi Krishnan)     ║');
console.log('║   ✅ src/app/api/cto/        — CTO Agent (Rahul Gupta)       ║');
console.log('║   ✅ src/app/api/hr/         — HR Agent  (Kavitha Reddy)     ║');
console.log('║   ✅ src/app/api/boardroom-run/ — Orchestrator               ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log('║   NOW RUN:                                                   ║');
console.log('║   git add .                                                  ║');
console.log('║   git commit -m "Vishwakarma AI v4 — Full Historic Vision"   ║');
console.log('║   git push                                                   ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('\n🇮🇳 Built by Anubhab Roy · Agartala, Tripura · Changing the world\n');
