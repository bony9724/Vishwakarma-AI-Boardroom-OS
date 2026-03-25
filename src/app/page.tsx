'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type Phase = 'landing' | 'awakening' | 'command' | 'activating' | 'boardroom' | 'decision' | 'executing' | 'complete';
type VoiceStep = 'company' | 'industry' | 'command' | null;

interface ExecMessage {
  role: string; name: string; title: string;
  content: string; timestamp: string; gender?: string;
}
interface Lead {
  name: string; company: string; role: string;
  email: string; linkedin: string; reason: string;
}
interface BoardResult {
  discussion: ExecMessage[];
  boardDecision: string;
  actionItems: string[];
  leads?: Lead[];
  linkedinPost?: string;
}
interface AgentStatus {
  gmail: 'idle'|'running'|'done'|'error';
  docs: 'idle'|'running'|'done'|'error';
  sheets: 'idle'|'running'|'done'|'error';
  calendar: 'idle'|'running'|'done'|'error';
  leads: 'idle'|'running'|'done'|'error';
  linkedin: 'idle'|'running'|'done'|'error';
  coldEmail: 'idle'|'running'|'done'|'error';
}
interface AgentLinks { gmail?: string; docs?: string; sheets?: string; calendar?: string; }

const EXECUTIVES = [
  { key:'ceo',     name:'Arjun Mehta',   title:'CHIEF EXECUTIVE OFFICER',  color:'#00D4FF', gender:'male' },
  { key:'cmo',     name:'Priya Sharma',  title:'CHIEF MARKETING OFFICER',  color:'#0099FF', gender:'female' },
  { key:'cfo',     name:'Vikram Nair',   title:'CHIEF FINANCIAL OFFICER',  color:'#0077EE', gender:'male' },
  { key:'coo',     name:'Ravi Krishnan', title:'CHIEF OPERATIONS OFFICER', color:'#0088FF', gender:'male' },
  { key:'cto',     name:'Rahul Gupta',   title:'CHIEF TECHNOLOGY OFFICER', color:'#00BBFF', gender:'male' },
  { key:'vpsales', name:'Deepak Joshi',  title:'VP SALES',                 color:'#00AAEE', gender:'male' },
  { key:'hr',      name:'Kavitha Reddy', title:'HEAD OF HUMAN RESOURCES',  color:'#0066DD', gender:'female' },
];

const AGENT_INFO = [
  { key:'gmail',     label:'GMAIL AGENT',       icon:'✉',  desc:'BOARDROOM REPORT' },
  { key:'docs',      label:'DOCS AGENT',         icon:'📄', desc:'FULL TRANSCRIPT' },
  { key:'sheets',    label:'SHEETS AGENT',       icon:'📊', desc:'DASHBOARD' },
  { key:'calendar',  label:'CALENDAR AGENT',     icon:'📅', desc:'STRATEGY MEETING' },
  { key:'leads',     label:'LEADS AGENT',        icon:'🎯', desc:'10 INDIAN LEADS' },
  { key:'linkedin',  label:'LINKEDIN AGENT',     icon:'💼', desc:'VIRAL POST' },
  { key:'coldEmail', label:'DEEPAK COLD EMAIL',  icon:'📧', desc:'AUTO OUTREACH' },
] as const;

const WAKE_LINES = [
  'VISHWAKARMA AI ONLINE.',
  'BOARDROOM OPERATING SYSTEM.',
  'VERSION 1.0 INITIALIZED.',
  '',
  'Namaste. I am Vishwakarma.',
  'Your AI Executive Assistant.',
  '',
  'I run complete boardrooms.',
  'I execute real world tasks.',
  'I manage your entire company.',
  '',
  'Speak your command.',
];

const VOICE_PROFILES: Record<string, { gender:string; rate:number; pitch:number }> = {
  ceo:     { gender:'male',   rate:0.90, pitch:0.82 },
  cmo:     { gender:'female', rate:0.93, pitch:1.18 },
  cfo:     { gender:'male',   rate:0.78, pitch:0.72 },
  coo:     { gender:'male',   rate:0.85, pitch:0.95 },
  cto:     { gender:'male',   rate:0.98, pitch:1.05 },
  vpsales: { gender:'male',   rate:1.02, pitch:1.08 },
  hr:      { gender:'female', rate:0.82, pitch:1.22 },
};

const cleanActionItem = (item: string) => item.replace(/^\d+[\.\)]\s*/, '').replace(/\*+/g, '').trim();
const cleanText = (text: string) => text.replace(/\*+/g, '').replace(/#+\s/g, '').replace(/__/g, '').trim();

const speakChunked = (text: string, rate = 0.88, pitch = 1.0, gender = 'male') => {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const raw = text.replace(/\n+/g, ' ').trim();
  const sentences = raw.match(/[^.!?]+[.!?]+/g) || [raw];
  const chunks: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > 120) { if (cur) chunks.push(cur.trim()); cur = s; } else cur += s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  if (!chunks.length) chunks.push(raw.slice(0, 150));
  const voices = window.speechSynthesis.getVoices();
  const fVoice = voices.find(v => v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.toLowerCase().includes('female'));
  const mVoice = voices.find(v => v.name.includes('David') || v.name.includes('Daniel') || v.name.includes('Mark') || v.name.toLowerCase().includes('male'));
  let i = 0;
  const next = () => {
    if (i >= chunks.length) return;
    const u = new SpeechSynthesisUtterance(chunks[i]);
    u.rate = rate; u.pitch = pitch; u.volume = 1;
    if (gender === 'female' && fVoice) u.voice = fVoice;
    else if (gender === 'male' && mVoice) u.voice = mVoice;
    else if (voices.length > 0) u.voice = gender === 'female' ? (voices[1] || voices[0]) : voices[0];
    u.onend = () => { i++; setTimeout(next, 80); };
    u.onerror = () => { i++; setTimeout(next, 80); };
    window.speechSynthesis.speak(u);
  };
  setTimeout(next, 100);
};

const getSpeechDuration = (text: string, rate = 0.88): number => {
  const wordCount = text.trim().split(/\s+/).length;
  const wordsPerMinute = 150 * rate;
  return (wordCount / wordsPerMinute) * 60 * 1000 + 2000;
};

type Particle = { x:number; y:number; tx:number; ty:number; life:number; size:number; alpha:number; speed:number };

function HolographicFace({ speaking, voiceListening = false }: { speaking: boolean; voiceListening?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef<number>(0);
  const parts = useRef<Particle[]>([]);
  const blinkT = useRef<number>(0);
  const blinking = useRef<boolean>(false);
  const scanY = useRef<number>(0);

  const draw = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2 - 10, fw = W * 0.38, fh = H * 0.52;

    // Hex grid background
    ctx.save(); ctx.globalAlpha = 0.055; ctx.strokeStyle = '#00D4FF'; ctx.lineWidth = 0.5;
    const hs = 26;
    for (let r = -1; r < H / hs + 1; r++) for (let c = -1; c < W / (hs * 1.732) + 1; c++) {
      const hx = c * hs * 1.732 + (r % 2 === 0 ? 0 : hs * 0.866), hy = r * hs * 0.75;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i - Math.PI / 6; i === 0 ? ctx.moveTo(hx + hs * 0.5 * Math.cos(a), hy + hs * 0.5 * Math.sin(a)) : ctx.lineTo(hx + hs * 0.5 * Math.cos(a), hy + hs * 0.5 * Math.sin(a)); }
      ctx.closePath(); ctx.stroke();
    }
    ctx.restore();

    // Face glow — more intense when speaking
    const glowIntensity = speaking ? 0.32 : (voiceListening ? 0.26 : 0.22);
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, fh);
    grd.addColorStop(0, `rgba(0,140,255,${glowIntensity})`);
    grd.addColorStop(0.6, 'rgba(0,80,200,0.07)');
    grd.addColorStop(1, 'transparent');
    ctx.save(); ctx.fillStyle = grd; ctx.beginPath(); ctx.ellipse(cx, cy, fw * 1.4, fh * 1.25, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();

    // ENHANCED PARTICLES
    ctx.save();
    const ps = parts.current;
    const maxParts = speaking ? 320 : (voiceListening ? 200 : 150);
    const addChance = speaking ? 0.55 : (voiceListening ? 0.25 : 0.15);

    if (ps.length < maxParts && Math.random() < addChance) {
      if (speaking) {
        // BURST outward from face center
        const angle = Math.random() * Math.PI * 2;
        const startR = Math.random() * fw * 0.25;
        const endR = fw * 0.9 + Math.random() * fw * 0.7;
        ps.push({ x: cx + Math.cos(angle) * startR, y: cy + Math.sin(angle) * startR * (fh/fw), tx: cx + Math.cos(angle) * endR, ty: cy + Math.sin(angle) * endR * (fh/fw), life: 0, size: Math.random() * 2.8 + 0.5, alpha: 0, speed: Math.random() * 0.022 + 0.012 });
      } else {
        const a = Math.random() * Math.PI * 2, r = Math.random() * fw * 1.15;
        ps.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * (fh/fw), tx: cx + Math.cos(a) * fw * 0.36 * Math.random(), ty: cy + Math.sin(a) * fh * 0.43 * Math.random(), life: Math.random() * 0.1, size: Math.random() * 1.9 + 0.4, alpha: 0, speed: Math.random() * 0.013 + 0.004 });
      }
    }

    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]; p.life += p.speed;
      const moveSpeed = speaking ? 0.13 : 0.07;
      if (p.life < 0.3) { p.alpha = p.life / 0.3; p.x += (p.tx - p.x) * moveSpeed; p.y += (p.ty - p.y) * moveSpeed; }
      else if (p.life < 0.85) { p.alpha = 1; p.x += (Math.random() - 0.5) * (speaking ? 0.9 : 0.35); p.y += (Math.random() - 0.5) * (speaking ? 0.9 : 0.35); }
      else if (p.life < 1) { p.alpha = (1 - p.life) / 0.15; }
      else { ps.splice(i, 1); continue; }
      const particleColor = voiceListening ? '#00FFAA' : (speaking && Math.random() > 0.65 ? '#FFFFFF' : '#00D4FF');
      ctx.globalAlpha = p.alpha * 0.75 * (speaking ? 1 + 0.4 * Math.sin(t * 9 + i * 0.3) : 1);
      ctx.fillStyle = particleColor;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Face outline
    const la = 0.58 + 0.1 * Math.sin(t * 1.4);
    ctx.save(); ctx.strokeStyle = voiceListening ? '#00FFAA' : '#00D4FF';
    ctx.shadowColor = voiceListening ? '#00FFAA' : '#00D4FF';
    ctx.shadowBlur = speaking ? 14 : 7; ctx.lineWidth = 1; ctx.globalAlpha = la;
    ctx.beginPath(); ctx.ellipse(cx, cy, fw, fh, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy - fh * 0.28, fw * 0.68, fh * 0.26, 0, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = la * 0.6;
    [[-1],[1]].forEach(([s]) => { ctx.beginPath(); ctx.moveTo(cx + s! * fw * 0.83, cy - fh * 0.04); ctx.bezierCurveTo(cx + s! * fw * 0.64, cy + fh * 0.11, cx + s! * fw * 0.44, cy + fh * 0.22, cx + s! * fw * 0.19, cy + fh * 0.36); ctx.stroke(); });
    ctx.globalAlpha = la * 0.72;
    ctx.beginPath(); ctx.moveTo(cx - fw * 0.5, cy + fh * 0.29); ctx.bezierCurveTo(cx - fw * 0.34, cy + fh * 0.49, cx - fw * 0.14, cy + fh * 0.57, cx, cy + fh * 0.59); ctx.bezierCurveTo(cx + fw * 0.14, cy + fh * 0.57, cx + fw * 0.34, cy + fh * 0.49, cx + fw * 0.5, cy + fh * 0.29); ctx.stroke();
    ctx.globalAlpha = la * 0.22; ctx.beginPath(); ctx.moveTo(cx, cy - fh * 0.56); ctx.lineTo(cx, cy + fh * 0.56); ctx.stroke();
    [-0.17, 0.09, 0.31].forEach(yf => { ctx.globalAlpha = la * 0.18; const hw = fw * (1 - Math.abs(yf) * 0.5) * 0.88; ctx.beginPath(); ctx.moveTo(cx - hw, cy + fh * yf); ctx.lineTo(cx + hw, cy + fh * yf); ctx.stroke(); });
    ctx.globalAlpha = la * 0.72;
    [[-1],[1]].forEach(([s]) => { ctx.beginPath(); ctx.moveTo(cx, cy - fh * 0.07); ctx.bezierCurveTo(cx + s! * fw * 0.07, cy + fh * 0.07, cx + s! * fw * 0.1, cy + fh * 0.15, cx + s! * fw * 0.12, cy + fh * 0.19); ctx.stroke(); });
    ctx.beginPath(); ctx.arc(cx, cy + fh * 0.2, fw * 0.1, 0, Math.PI); ctx.stroke();

    // Blinking
    blinkT.current += 0.016;
    if (blinkT.current > 4.4) { blinking.current = true; if (blinkT.current > 4.65) { blinking.current = false; blinkT.current = 0; } }
    const bs = blinking.current ? 0.07 : 1;
    const ey = cy - fh * 0.11, eox = fw * 0.28, erx = fw * 0.165, ery = fh * 0.072;

    // ENHANCED EYES — dramatic scanning pupils
    const pupilScanX = speaking ? fw * 0.09 * Math.sin(t * 4.8 + 0.5) : fw * 0.04 * Math.sin(t * 1.1);
    const pupilScanY = speaking ? fh * 0.04 * Math.cos(t * 3.3) : fh * 0.02 * Math.cos(t * 0.7);

    [-1, 1].forEach(s => {
      const ex = cx + s * eox;
      ctx.globalAlpha = la; ctx.strokeStyle = voiceListening ? '#00FFAA' : '#00D4FF';
      ctx.beginPath(); ctx.ellipse(ex, ey, erx, ery * bs, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(ex, ey, erx * 0.44 * bs, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#001828'; ctx.globalAlpha = la;
      ctx.beginPath(); ctx.arc(ex + pupilScanX * s, ey + pupilScanY, erx * 0.17 * bs, 0, Math.PI * 2); ctx.fill();
      // Intense glow — pulses when speaking
      const eGlow = speaking ? (0.9 + 0.65 * Math.abs(Math.sin(t * 7))) : (voiceListening ? (0.8 + 0.4 * Math.sin(t * 4)) : 0.9);
      ctx.globalAlpha = eGlow;
      const glowR = voiceListening ? 0 : 0;
      const glowG = voiceListening ? 255 : 230;
      const glowB = voiceListening ? 170 : 255;
      const eyeR = speaking ? erx * 0.58 : erx * 0.4;
      const pg = ctx.createRadialGradient(ex + pupilScanX * s, ey + pupilScanY, 0, ex, ey, eyeR);
      pg.addColorStop(0, `rgba(${glowR},${glowG},${glowB},0.95)`);
      pg.addColorStop(0.5, `rgba(${glowR},${glowG},${glowB},0.5)`);
      pg.addColorStop(1, 'rgba(0,80,180,0)');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(ex, ey, eyeR * bs, 0, Math.PI * 2); ctx.fill();
    });

    // ENHANCED EYEBROWS — raise dramatically when speaking
    const browRaise = speaking
      ? fh * 0.042 * (0.5 + 0.5 * Math.abs(Math.sin(t * 2.8)))
      : fh * 0.006 * Math.sin(t * 0.9);
    ctx.globalAlpha = la * 0.85; ctx.strokeStyle = voiceListening ? '#00FFAA' : '#00D4FF';
    [-1, 1].forEach(s => {
      const bx = cx + s * eox;
      const bby = ey - ery * 1.95 - browRaise;
      ctx.beginPath();
      if (speaking) {
        ctx.moveTo(bx - fw * 0.17, bby + fh * 0.016);
        ctx.bezierCurveTo(bx - fw * 0.04, bby - fh * 0.030, bx + fw * 0.04, bby - fh * 0.030, bx + fw * 0.17, bby + fh * 0.016);
      } else {
        ctx.moveTo(bx - fw * 0.16, bby + fh * 0.012);
        ctx.bezierCurveTo(bx - fw * 0.04, bby - fh * 0.019, bx + fw * 0.04, bby - fh * 0.019, bx + fw * 0.16, bby + fh * 0.012);
      }
      ctx.stroke();
    });

    // MOUTH — wider open when speaking
    const my = cy + fh * 0.32, mw = fw * 0.31;
    const open = speaking
      ? (0.08 + 0.09 * Math.abs(Math.sin(t * 7.8))) * fh
      : 0.014 * fh + 0.008 * fh * Math.sin(t * 1.1);
    ctx.globalAlpha = la; ctx.strokeStyle = voiceListening ? '#00FFAA' : '#00D4FF';
    ctx.beginPath(); ctx.moveTo(cx - mw, my); ctx.bezierCurveTo(cx - mw * 0.5, my - fh * 0.024, cx, my - fh * 0.03, cx + mw * 0.5, my - fh * 0.024); ctx.bezierCurveTo(cx + mw * 0.7, my - fh * 0.014, cx + mw, my, cx + mw, my); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - mw, my); ctx.bezierCurveTo(cx - mw * 0.5, my + open, cx, my + open * 1.4, cx + mw * 0.5, my + open); ctx.bezierCurveTo(cx + mw * 0.7, my + open * 0.5, cx + mw, my, cx + mw, my); ctx.stroke();

    // SCAN LINE — faster + color shifts when speaking
    scanY.current = (scanY.current + (speaking ? 0.013 : 0.007)) % 1;
    const sy2 = (cy - fh) + scanY.current * fh * 2;
    const scanAlpha = speaking ? 0.19 : 0.11;
    const scanG2 = speaking ? Math.floor(180 + 75 * Math.abs(Math.sin(t * 3))) : 212;
    const scanB2 = speaking ? Math.floor(200 + 55 * Math.abs(Math.sin(t * 2))) : 255;
    const sg2 = ctx.createLinearGradient(0, sy2 - 28, 0, sy2 + 28);
    sg2.addColorStop(0, 'rgba(0,0,0,0)');
    sg2.addColorStop(0.5, `rgba(0,${scanG2},${scanB2},${scanAlpha})`);
    sg2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 1; ctx.fillStyle = sg2; ctx.fillRect(cx - fw, sy2 - 28, fw * 2, 56);
    ctx.globalAlpha = speaking ? 0.9 : 0.72;
    ctx.strokeStyle = speaking ? `rgb(0,${scanG2},${scanB2})` : '#00FFFF';
    ctx.lineWidth = speaking ? 2 : 1.5; ctx.shadowBlur = speaking ? 14 : 9;

    // Corner brackets
    const bp = 10, bsz = 19;
    ctx.lineWidth = 1.5; ctx.strokeStyle = voiceListening ? '#00FFAA' : '#00FFFF';
    [[cx-fw-bp,cy-fh-bp,1,1],[cx+fw+bp,cy-fh-bp,-1,1],[cx-fw-bp,cy+fh+bp,1,-1],[cx+fw+bp,cy+fh+bp,-1,-1]].forEach(([x,y,dx,dy])=>{
      ctx.beginPath(); ctx.moveTo(x+dx*bsz,y); ctx.lineTo(x,y); ctx.lineTo(x,y+dy*bsz); ctx.stroke();
    });

    // Voice listening ring
    if (voiceListening) {
      ctx.globalAlpha = 0.4 + 0.3 * Math.abs(Math.sin(t * 4));
      ctx.strokeStyle = '#00FFAA'; ctx.lineWidth = 2; ctx.shadowColor = '#00FFAA'; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.ellipse(cx, cy, fw * 1.55, fh * 1.38, 0, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.restore();
  }, [speaking, voiceListening]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const loop = () => { tRef.current += 0.016; draw(ctx, canvas.width, canvas.height, tRef.current); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return <canvas ref={canvasRef} width={320} height={380} className="mx-auto block" />;
}

function ExecCard({ exec, msg, active }: { exec: typeof EXECUTIVES[0]; msg?: ExecMessage; active: boolean }) {
  return (
    <div className="rounded-lg border overflow-hidden transition-all duration-500" style={{ borderColor: active ? exec.color : '#001a3a', background: 'rgba(0,12,38,0.92)', boxShadow: active ? `0 0 30px ${exec.color}55` : '0 0 6px #00112222' }}>
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: active ? `linear-gradient(90deg,${exec.color}1a,transparent)` : 'transparent', borderBottom: `1px solid ${active ? exec.color : '#001a3a'}` }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-xs flex-shrink-0" style={{ border: `1px solid ${exec.color}`, color: exec.color, background: `${exec.color}18`, boxShadow: active ? `0 0 14px ${exec.color}88` : 'none' }}>
          {exec.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-mono font-bold truncate" style={{ color: exec.color, fontFamily: 'Orbitron, sans-serif', fontSize: 11 }}>{exec.name}</div>
          <div className="font-mono opacity-50 truncate" style={{ color: '#88bbff', fontSize: 9, letterSpacing: 1 }}>{exec.title}</div>
        </div>
        {active && <div className="flex items-center gap-1.5 flex-shrink-0"><div className="w-2 h-2 rounded-full animate-pulse" style={{ background: exec.color }} /><span style={{ color: exec.color, fontSize: 9, fontFamily: 'monospace', letterSpacing: 2 }}>SPEAKING</span></div>}
      </div>
      {msg && (
        <div className="px-4 py-3">
          <p className="font-mono leading-relaxed" style={{ color: active ? '#cceeff' : '#88aadd', fontSize: 11, maxHeight: 130, overflow: 'hidden' }}>
            {cleanText(msg.content.length > 400 ? msg.content.slice(0, 400) + '…' : msg.content)}
          </p>
          {msg.timestamp && <div className="mt-1.5 font-mono" style={{ color: '#334466', fontSize: 9 }}>{msg.timestamp}</div>}
        </div>
      )}
    </div>
  );
}

function AgentPanel({ label, icon, desc, status, link }: { label:string; icon:string; desc:string; status:'idle'|'running'|'done'|'error'; link?: string }) {
  const c = { idle:'#003366', running:'#00AAFF', done:'#00FFAA', error:'#FF5555' }[status];
  const t2 = { idle:'STANDBY', running:'EXECUTING...', done:'✓ COMPLETE', error:'ERROR' }[status];
  return (
    <div className="relative rounded-lg border p-3 overflow-hidden transition-all duration-500" style={{ borderColor: c, background: 'rgba(0,15,45,0.9)', boxShadow: `0 0 ${status === 'running' ? 22 : 10}px ${c}44` }}>
      {status === 'running' && <div className="absolute inset-0 rounded-lg" style={{ background: `linear-gradient(90deg,transparent,${c}18,transparent)`, animation: 'sweep 1.4s linear infinite' }} />}
      <div className="relative z-10">
        <div className="text-xl mb-1">{icon}</div>
        <div className="font-mono font-bold tracking-widest mb-0.5" style={{ color: c, fontFamily: 'Orbitron, sans-serif', fontSize: 8 }}>{label}</div>
        <div className="font-mono opacity-50 mb-1" style={{ color: '#4466aa', fontSize: 8 }}>{desc}</div>
        <div className="font-mono font-bold" style={{ color: c, fontSize: 10 }}>{t2}</div>
        {link && status === 'done' && <a href={link} target="_blank" rel="noreferrer" className="mt-1 inline-block font-mono underline" style={{ color: '#00FFAA', fontSize: 9 }}>→ VIEW</a>}
      </div>
    </div>
  );
}

export default function VishwakarmaAI() {
  const [phase, setPhase] = useState<Phase>('landing');
  const [wakeText, setWakeText] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [command, setCommand] = useState('');
  const [email, setEmail] = useState('');
  const [activationStep, setActivationStep] = useState(0);
  const [activeExec, setActiveExec] = useState(-1);
  const [boardResult, setBoardResult] = useState<BoardResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({ gmail:'idle', docs:'idle', sheets:'idle', calendar:'idle', leads:'idle', linkedin:'idle', coldEmail:'idle' });
  const [agentLinks, setAgentLinks] = useState<AgentLinks>({});
  const [missionText, setMissionText] = useState('');
  const [missionDone, setMissionDone] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState('');
  const [readingDecision, setReadingDecision] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [linkedinPost, setLinkedinPost] = useState('');
  const [copied, setCopied] = useState(false);
  // Voice states
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceStep, setVoiceStep] = useState<VoiceStep>(null);
  const [voiceCompleted, setVoiceCompleted] = useState(false);
  const [voiceHint, setVoiceHint] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  useEffect(() => {
    if (phase !== 'awakening') return;
    let li = 0, ci = 0;
    speakChunked('Namaste. I am Vishwakarma. Your AI Executive Assistant. Seven AI executives will debate your command and execute real world tasks. Speak your command.', 0.82, 0.72, 'male');
    const tick = () => {
      if (li >= WAKE_LINES.length) { setTimeout(() => setPhase('command'), 700); return; }
      const line = WAKE_LINES[li];
      if (ci <= line.length) { setWakeText(WAKE_LINES.slice(0, li).join('\n') + (li > 0 ? '\n' : '') + line.slice(0, ci)); ci++; setTimeout(tick, line === '' ? 0 : 36); }
      else { li++; ci = 0; setTimeout(tick, line === '' ? 70 : 170); }
    };
    const t = setTimeout(tick, 800);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase === 'decision' && boardResult) {
      setTimeout(() => readDecisionAloud(), 600);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Voice completed — auto-run activation
  useEffect(() => {
    if (voiceCompleted && companyName && command) {
      setVoiceCompleted(false);
      setTimeout(() => runActivation(), 200);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceCompleted, companyName, command]);

  // VOICE COMMAND FUNCTIONS
  const listenOnce = useCallback((onResult: (text: string) => void) => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'en-IN'; rec.continuous = false; rec.interimResults = false;
    rec.onresult = (e: any) => { if (e.results?.[0]?.[0]) onResult(e.results[0][0].transcript.trim()); };
    rec.onerror = () => { setVoiceActive(false); setVoiceStep(null); };
    rec.start();
  }, []);

  const startVoiceSequence = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Voice input requires Google Chrome browser.'); return; }

    setVoiceActive(true);
    setVoiceStep('company');

    const p1 = 'Namaste. Please tell me your company name.';
    setVoiceHint('Listening for company name...');
    speakChunked(p1, 0.82, 0.72, 'male');
    const d1 = getSpeechDuration(p1, 0.82);

    setTimeout(() => {
      listenOnce((company) => {
        setCompanyName(company);
        setVoiceStep('industry');
        const p2 = `Got it. ${company}. Now tell me your industry sector.`;
        setVoiceHint('Listening for industry...');
        speakChunked(p2, 0.82, 0.72, 'male');
        const d2 = getSpeechDuration(p2, 0.82);

        setTimeout(() => {
          listenOnce((ind) => {
            setIndustry(ind);
            setVoiceStep('command');
            const p3 = 'Perfect. Now speak your boardroom command. What is your main business challenge?';
            setVoiceHint('Listening for your command...');
            speakChunked(p3, 0.82, 0.72, 'male');
            const d3 = getSpeechDuration(p3, 0.82);

            setTimeout(() => {
              listenOnce((cmd) => {
                setCommand(cmd);
                setVoiceActive(false);
                setVoiceStep(null);
                setVoiceHint('');
                const confirm = `Understood. Initiating boardroom sequence for ${company}. Your seven executives are assembling now.`;
                speakChunked(confirm, 0.82, 0.72, 'male');
                const dConf = getSpeechDuration(confirm, 0.82);
                setTimeout(() => setVoiceCompleted(true), dConf + 200);
              });
            }, d3 + 200);
          });
        }, d2 + 200);
      });
    }, d1 + 200);
  }, [listenOnce]);

  const runActivation = async () => {
    setPhase('activating');
    speakChunked('Activating Neural Boardroom. Loading all seven executive agents.', 0.85, 0.75, 'male');
    for (let i = 0; i <= EXECUTIVES.length; i++) {
      await delay(400); setActivationStep(i);
      if (i < EXECUTIVES.length) {
        await delay(150);
        speakChunked(`${EXECUTIVES[i].name}. Online.`, 0.9, EXECUTIVES[i].gender === 'female' ? 1.2 : 0.88, EXECUTIVES[i].gender);
        await delay(400);
      }
    }
    await delay(300);
    runBoardroom();
  };

  const runBoardroom = async () => {
    setPhase('boardroom'); setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000);
      const res = await fetch('/api/boardroom', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, industry, command }), signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data: BoardResult = await res.json();
      setBoardResult(data);
      if (data.leads && data.leads.length > 0) setLeads(data.leads);
      if (data.linkedinPost) setLinkedinPost(data.linkedinPost);

      for (let i = 0; i < data.discussion.length; i++) {
        setActiveExec(i); setCurrentSpeaker(data.discussion[i].name);
        const exec = data.discussion[i];
        const profile = VOICE_PROFILES[exec.role] || { gender: 'male', rate: 0.88, pitch: 1 };
        speakChunked(`${exec.name} speaking.`, 0.9, 0.82, 'male');
        await delay(900);
        speakChunked(exec.content.slice(0, 500), profile.rate, profile.pitch, profile.gender);
        const speechDuration = getSpeechDuration(exec.content.slice(0, 500), profile.rate);
        await delay(speechDuration);
      }
      setActiveExec(-1); setCurrentSpeaker('');
      window.speechSynthesis.cancel();
      await delay(400);
      setPhase('decision');
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const readDecisionAloud = () => {
    if (!boardResult) return;
    setReadingDecision(true);
    const cleanDecision = cleanText(boardResult.boardDecision);
    const cleanItems = boardResult.actionItems.map(cleanActionItem).join('. ');
    const text = `The board has reached a unanimous decision. ${cleanDecision}. The action items are: ${cleanItems}`;
    speakChunked(text, 0.80, 0.72, 'male');
    const duration = getSpeechDuration(text, 0.80);
    setTimeout(() => setReadingDecision(false), duration);
  };

  const runAgents = async () => {
    setPhase('executing'); if (!boardResult) return;
    setMissionText('INITIATING AGENT EXECUTION SEQUENCE...');
    speakChunked('Initiating all seven agents. Gmail. Docs. Sheets. Calendar. Leads. LinkedIn. Cold Email Outreach.', 0.85, 0.72, 'male');

    // Gmail
    setAgentStatus(p => ({ ...p, gmail: 'running' }));
    try {
      const r = await fetch('/api/gmail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyName, command, email, boardResult }) });
      if (r.ok) { setAgentStatus(p => ({ ...p, gmail: 'done' })); speakChunked('Gmail complete.', 0.9, 0.8, 'male'); }
      else setAgentStatus(p => ({ ...p, gmail: 'error' }));
    } catch { setAgentStatus(p => ({ ...p, gmail: 'error' })); }
    await delay(400);

    // Docs
    setAgentStatus(p => ({ ...p, docs: 'running' }));
    try {
      const r = await fetch('/api/docs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyName, command, email, boardResult }) });
      const d = await r.json();
      if (r.ok) { setAgentStatus(p => ({ ...p, docs: 'done' })); if (d.link) setAgentLinks(p => ({ ...p, docs: d.link })); speakChunked('Google Doc created.', 0.9, 0.8, 'male'); }
      else setAgentStatus(p => ({ ...p, docs: 'error' }));
    } catch { setAgentStatus(p => ({ ...p, docs: 'error' })); }
    await delay(400);

    // Sheets
    setAgentStatus(p => ({ ...p, sheets: 'running' }));
    try {
      const r = await fetch('/api/sheets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyName, command, email, boardResult }) });
      const d = await r.json();
      if (r.ok) { setAgentStatus(p => ({ ...p, sheets: 'done' })); if (d.link) setAgentLinks(p => ({ ...p, sheets: d.link })); speakChunked('Google Sheets updated.', 0.9, 0.8, 'male'); }
      else setAgentStatus(p => ({ ...p, sheets: 'error' }));
    } catch { setAgentStatus(p => ({ ...p, sheets: 'error' })); }
    await delay(400);

    // Calendar
    setAgentStatus(p => ({ ...p, calendar: 'running' }));
    try {
      const r = await fetch('/api/calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyName, command, email, boardResult }) });
      const d = await r.json();
      if (r.ok && d.success !== false) { setAgentStatus(p => ({ ...p, calendar: 'done' })); if (d.link) setAgentLinks(p => ({ ...p, calendar: d.link })); speakChunked('Calendar meeting booked.', 0.9, 0.8, 'male'); }
      else setAgentStatus(p => ({ ...p, calendar: 'error' }));
    } catch { setAgentStatus(p => ({ ...p, calendar: 'error' })); }
    await delay(400);

    // Leads
    let leadsData = leads;
    setAgentStatus(p => ({ ...p, leads: 'running' }));
    try {
      if (leads.length > 0) {
        setAgentStatus(p => ({ ...p, leads: 'done' }));
        speakChunked('Ten leads generated.', 0.9, 0.8, 'male');
      } else {
        const r = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ industry, company: companyName }) });
        const d = await r.json();
        if (r.ok && d.leads) { leadsData = d.leads; setLeads(d.leads); setAgentStatus(p => ({ ...p, leads: 'done' })); speakChunked('Ten leads generated.', 0.9, 0.8, 'male'); }
        else setAgentStatus(p => ({ ...p, leads: 'error' }));
      }
    } catch { setAgentStatus(p => ({ ...p, leads: 'error' })); }
    await delay(400);

    // LinkedIn
    setAgentStatus(p => ({ ...p, linkedin: 'running' }));
    try {
      if (linkedinPost) { setAgentStatus(p => ({ ...p, linkedin: 'done' })); speakChunked('LinkedIn post ready.', 0.9, 0.8, 'male'); }
      else {
        const r = await fetch('/api/linkedin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyName, boardDecision: boardResult.boardDecision }) });
        const d = await r.json();
        if (r.ok && d.post) { setLinkedinPost(d.post); setAgentStatus(p => ({ ...p, linkedin: 'done' })); speakChunked('LinkedIn post ready.', 0.9, 0.8, 'male'); }
        else setAgentStatus(p => ({ ...p, linkedin: 'error' }));
      }
    } catch { setAgentStatus(p => ({ ...p, linkedin: 'error' })); }
    await delay(400);

    // DEEPAK COLD EMAILS — AUTO SEND TO ALL LEADS
    setAgentStatus(p => ({ ...p, coldEmail: 'running' }));
    speakChunked('Deepak is now sending personalized cold emails to all ten prospects. Autonomous outreach initiated.', 0.9, 0.8, 'male');
    try {
      if (leadsData.length > 0) {
        const r = await fetch('/api/gmail/cold-email', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leads: leadsData, companyName, industry, boardDecision: boardResult.boardDecision }),
        });
        const d = await r.json();
        if (r.ok && d.success) {
          setAgentStatus(p => ({ ...p, coldEmail: 'done' }));
          speakChunked(`Deepak has sent ${d.sent} cold emails to prospects on behalf of ${companyName}.`, 0.9, 0.8, 'male');
        } else { setAgentStatus(p => ({ ...p, coldEmail: 'error' })); }
      } else { setAgentStatus(p => ({ ...p, coldEmail: 'error' })); }
    } catch { setAgentStatus(p => ({ ...p, coldEmail: 'error' })); }
    await delay(600);

    setPhase('complete'); setMissionDone(true);
    setMissionText('MISSION ACCOMPLISHED.\nALL 7 AGENTS EXECUTED.\nYOUR COMPANY IS RUNNING.');
    setTimeout(() => speakChunked('Mission accomplished. All seven agents have executed. Deepak has sent cold emails to all ten prospects. Your company is now running on Vishwakarma AI.', 0.80, 0.70, 'male'), 700);
  };

  const speaking = phase === 'awakening' || phase === 'activating' || missionDone || activeExec >= 0 || readingDecision;

  const resetAll = () => {
    setPhase('landing'); setBoardResult(null);
    setAgentStatus({ gmail:'idle', docs:'idle', sheets:'idle', calendar:'idle', leads:'idle', linkedin:'idle', coldEmail:'idle' });
    setAgentLinks({}); setMissionDone(false); setMissionText(''); setCurrentSpeaker('');
    setLeads([]); setLinkedinPost(''); setCopied(false);
    setVoiceActive(false); setVoiceStep(null); setVoiceHint('');
    window.speechSynthesis.cancel();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body,html{background:#000008;color:#00D4FF;font-family:'Share Tech Mono',monospace;min-height:100vh;}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:#000018;}::-webkit-scrollbar-thumb{background:#00D4FF33;border-radius:2px;}
        @keyframes sweep{0%{transform:translateX(-100%);}100%{transform:translateX(200%);}}
        @keyframes hglow{0%,100%{text-shadow:0 0 18px #00D4FF,0 0 36px #00D4FF88;}50%{text-shadow:0 0 28px #00FFFF,0 0 55px #00FFFF99;}}
        @keyframes dpulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.35;transform:scale(0.65);}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
        @keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);}}
        @keyframes micPulse{0%,100%{box-shadow:0 0 0 0 rgba(0,255,170,0.6);}70%{box-shadow:0 0 0 16px rgba(0,255,170,0);}}
        .fu{animation:fadeUp 0.55s ease forwards;}
        .orb{font-family:'Orbitron',sans-serif;}
        .panel{background:rgba(0,18,55,0.88);border:1px solid #00D4FF22;border-radius:8px;box-shadow:0 0 14px #00D4FF18;}
        .sdot{animation:dpulse 1.9s ease-in-out infinite;}
        .inp{background:rgba(0,18,55,0.7);border:1px solid #00D4FF33;color:#00D4FF;font-family:'Share Tech Mono',monospace;border-radius:4px;padding:10px 14px;width:100%;outline:none;transition:border-color .2s,box-shadow .2s;font-size:13px;}
        .inp:focus{border-color:#00D4FF;box-shadow:0 0 12px #00D4FF44;}
        .inp::placeholder{color:#00446655;}
        .btn{background:transparent;border:1px solid #00D4FF;color:#00D4FF;font-family:'Orbitron',sans-serif;font-size:12px;letter-spacing:2px;padding:11px 24px;border-radius:4px;cursor:pointer;transition:all .25s;text-transform:uppercase;}
        .btn:hover{background:#00D4FF;color:#000018;box-shadow:0 0 24px #00D4FFaa;}
        .btn-big{background:linear-gradient(135deg,#002d80,#0044bb);border:1px solid #00D4FF;color:#00D4FF;font-family:'Orbitron',sans-serif;font-size:13px;letter-spacing:3px;padding:15px 36px;border-radius:4px;cursor:pointer;box-shadow:0 0 26px #00D4FF55,inset 0 0 18px #0055FF22;transition:all .3s;text-transform:uppercase;width:100%;}
        .btn-big:hover{box-shadow:0 0 40px #00D4FFaa;transform:translateY(-1px);}
        .btn-big:disabled{opacity:0.35;cursor:not-allowed;transform:none;}
        .btn-voice{background:transparent;border:1px solid #00FFAA;color:#00FFAA;font-family:'Orbitron',sans-serif;font-size:11px;letter-spacing:2px;padding:8px 18px;border-radius:4px;cursor:pointer;transition:all .25s;margin-bottom:16px;}
        .btn-voice:hover{background:#00FFAA22;}
        .btn-mic{background:linear-gradient(135deg,#003322,#005533);border:2px solid #00FFAA;color:#00FFAA;font-family:'Orbitron',sans-serif;font-size:11px;letter-spacing:2px;padding:13px 22px;border-radius:4px;cursor:pointer;transition:all .3s;text-transform:uppercase;width:100%;margin-bottom:12px;}
        .btn-mic:hover{box-shadow:0 0 24px #00FFAA66;}
        .btn-mic.listening{animation:micPulse 1.2s ease-in-out infinite;background:linear-gradient(135deg,#004433,#007755);}
        .btn-enter{background:linear-gradient(135deg,#001a55,#003399);border:2px solid #00D4FF;color:#00D4FF;font-family:'Orbitron',sans-serif;font-size:16px;letter-spacing:4px;padding:20px 60px;border-radius:6px;cursor:pointer;box-shadow:0 0 40px #00D4FF66,inset 0 0 30px #0044FF22;transition:all .3s;text-transform:uppercase;animation:float 3s ease-in-out infinite;}
        .btn-enter:hover{box-shadow:0 0 60px #00D4FFaa;transform:translateY(-3px) scale(1.02);}
        .btn-copy{background:transparent;border:1px solid #0099FF;color:#0099FF;font-family:'Orbitron',sans-serif;font-size:10px;letter-spacing:2px;padding:6px 14px;border-radius:4px;cursor:pointer;transition:all .25s;}
        .btn-copy:hover{background:#0099FF22;}
        table{width:100%;border-collapse:collapse;}
        th{background:#001a44;color:#00D4FF;font-family:'Orbitron',sans-serif;font-size:9px;letter-spacing:2px;padding:8px 10px;text-align:left;border-bottom:1px solid #00D4FF33;}
        td{color:#88aacc;font-family:'Share Tech Mono',monospace;font-size:10px;padding:7px 10px;border-bottom:1px solid #001a3a;}
        tr:hover td{background:rgba(0,80,160,0.15);}
      `}</style>

      <div style={{ minHeight:'100vh', background:'#000008', position:'relative' }}>
        <div style={{ position:'fixed', inset:0, pointerEvents:'none', background:'radial-gradient(ellipse at 50% 30%, rgba(0,60,160,0.07) 0%, transparent 65%)', zIndex:0 }} />

        {/* HEADER */}
        <header style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 24px', borderBottom:'1px solid #00D4FF18', background:'rgba(0,4,18,0.97)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <svg width="42" height="42" viewBox="0 0 42 42"><defs><linearGradient id="vg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#00D4FF"/><stop offset="100%" stopColor="#0055FF"/></linearGradient></defs><rect width="42" height="42" rx="8" fill="url(#vg)" opacity="0.15"/><rect width="42" height="42" rx="8" fill="none" stroke="#00D4FF" strokeWidth="1.5"/><text x="21" y="30" textAnchor="middle" fontSize="26" fontWeight="900" fontFamily="Arial" fill="url(#vg)" style={{filter:'drop-shadow(0 0 6px #00D4FF)'}}>V</text></svg>
            <div>
              <div className="orb" style={{ color:'#00D4FF', fontSize:15, fontWeight:900, letterSpacing:3, animation:'hglow 3s ease-in-out infinite' }}>VISHWAKARMA AI</div>
              <div style={{ color:'#0055AA', fontSize:9, letterSpacing:2, fontFamily:'monospace' }}>WORLD'S FIRST MULTI-AGENT AI BOARDROOM OS</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:16, alignItems:'center' }}>
            {currentSpeaker && (
              <div style={{ display:'flex', alignItems:'center', gap:8, background:'#00D4FF18', border:'1px solid #00D4FF44', borderRadius:4, padding:'4px 12px' }}>
                <div className="sdot" style={{ width:6, height:6, borderRadius:'50%', background:'#00FFAA', boxShadow:'0 0 6px #00FFAA' }} />
                <span style={{ color:'#00FFAA', fontSize:10, fontFamily:'monospace', letterSpacing:1 }}>🎤 {currentSpeaker}</span>
              </div>
            )}
            {voiceActive && voiceHint && (
              <div style={{ display:'flex', alignItems:'center', gap:8, background:'#00FFAA18', border:'1px solid #00FFAA44', borderRadius:4, padding:'4px 12px' }}>
                <div className="sdot" style={{ width:6, height:6, borderRadius:'50%', background:'#00FFAA', boxShadow:'0 0 6px #00FFAA' }} />
                <span style={{ color:'#00FFAA', fontSize:10, fontFamily:'monospace', letterSpacing:1 }}>🎙 {voiceHint}</span>
              </div>
            )}
            {[['NEURAL NETWORK','ONLINE'],['7 AGENTS','READY']].map(([l,v]) => (
              <div key={l} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div className="sdot" style={{ width:7, height:7, borderRadius:'50%', background:'#00D4FF', boxShadow:'0 0 5px #00D4FF' }} />
                <span style={{ fontSize:9, color:'#004477', fontFamily:'monospace', letterSpacing:1 }}>{l}: <span style={{ color:'#00D4FF' }}>{v}</span></span>
              </div>
            ))}
          </div>
        </header>

        <main style={{ position:'relative', zIndex:10, maxWidth:1280, margin:'0 auto', padding:'32px 20px' }}>

          {/* LANDING */}
          {phase === 'landing' && (
            <div className="fu" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:32, textAlign:'center', paddingTop:20 }}>
              <div style={{ display:'inline-block', background:'#00D4FF22', border:'1px solid #00D4FF', borderRadius:4, padding:'6px 16px' }}>
                <span className="orb" style={{ color:'#00D4FF', fontSize:10, letterSpacing:4 }}>🔱 INVENTED IN INDIA — AGARTALA, TRIPURA</span>
              </div>
              <div>
                <div className="orb" style={{ color:'#00D4FF', fontSize:13, letterSpacing:4, marginBottom:12, animation:'hglow 3s infinite' }}>WORLD'S FIRST</div>
                <div className="orb" style={{ color:'#FFFFFF', fontSize:28, fontWeight:900, letterSpacing:2, lineHeight:1.3, textShadow:'0 0 30px #00D4FF' }}>MULTI-AGENT AI<br />BOARDROOM OS</div>
              </div>
              <div style={{ maxWidth:600, fontFamily:'monospace', fontSize:13, lineHeight:2, color:'#6699BB' }}>
                7 autonomous AI executives debate your business command.<br />
                They fight. They argue. They reach unanimous decisions.<br />
                Then 7 agents execute real tasks in the real world.
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10, maxWidth:700, width:'100%' }}>
                {[{icon:'🧠',label:'7 EXECUTIVES'},{icon:'⚔️',label:'REAL DEBATES'},{icon:'✉',label:'GMAIL'},{icon:'🎯',label:'10 LEADS'},{icon:'📧',label:'COLD EMAIL'},{icon:'🎤',label:'VOICE AI'}].map(f => (
                  <div key={f.label} className="panel" style={{ padding:'12px 8px', textAlign:'center' }}>
                    <div style={{ fontSize:20, marginBottom:4 }}>{f.icon}</div>
                    <div className="orb" style={{ color:'#00D4FF', fontSize:8, letterSpacing:1.5 }}>{f.label}</div>
                  </div>
                ))}
              </div>
              <button className="btn-enter" onClick={() => setPhase('awakening')}>⚡ ENTER BOARDROOM</button>
              <div style={{ color:'#002244', fontSize:10, fontFamily:'monospace' }}>INVENTED BY ANUBHAB ROY — VISHWAKARMAAI.COM</div>
            </div>
          )}

          {/* AWAKENING */}
          {phase === 'awakening' && (
            <div className="fu" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:28 }}>
              <HolographicFace speaking={true} />
              <div className="panel" style={{ padding:'32px 40px', maxWidth:420, width:'100%', textAlign:'center', minHeight:200 }}>
                <pre style={{ fontFamily:'Share Tech Mono, monospace', fontSize:13, lineHeight:2, color:'#00D4FF', whiteSpace:'pre-wrap' }}>
                  {wakeText}<span style={{ display:'inline-block', width:8, height:16, background:'#00FFFF', marginLeft:3, verticalAlign:'middle', animation:'dpulse 0.8s infinite' }} />
                </pre>
              </div>
            </div>
          )}

          {/* COMMAND */}
          {phase === 'command' && (
            <div className="fu" style={{ display:'flex', gap:28, flexWrap:'wrap' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, width:320, flexShrink:0 }}>
                <HolographicFace speaking={voiceActive} voiceListening={voiceActive} />
                <div className="panel" style={{ padding:'14px 20px', width:'100%', textAlign:'center' }}>
                  <div className="orb" style={{ color:'#004488', fontSize:9, letterSpacing:3 }}>VISHWAKARMA</div>
                  <div className="orb" style={{ color: voiceActive ? '#00FFAA' : '#00D4FF', fontSize:12, fontWeight:700, marginTop:4, letterSpacing:2 }}>
                    {voiceActive ? `🎙 ${voiceStep?.toUpperCase() || 'LISTENING'}...` : 'AWAITING COMMAND'}
                  </div>
                  {voiceActive && voiceHint && <div style={{ color:'#00FFAA88', fontSize:9, fontFamily:'monospace', marginTop:6 }}>{voiceHint}</div>}
                  <div className="sdot" style={{ display:'inline-block', width:7, height:7, borderRadius:'50%', background: voiceActive ? '#00FFAA' : '#00D4FF', boxShadow: voiceActive ? '0 0 7px #00FFAA' : '0 0 7px #00D4FF', marginTop:8 }} />
                </div>
              </div>
              <div style={{ flex:1, minWidth:300 }}>
                <div className="panel" style={{ padding:24, marginBottom:14 }}>
                  <div className="orb" style={{ color:'#00D4FF', fontSize:10, letterSpacing:3, borderBottom:'1px solid #00D4FF18', paddingBottom:12, marginBottom:20 }}>◈ INITIATE BOARDROOM SEQUENCE</div>

                  {/* VOICE COMMAND BUTTON */}
                  <button
                    className={`btn-mic ${voiceActive ? 'listening' : ''}`}
                    onClick={startVoiceSequence}
                    disabled={voiceActive}
                  >
                    {voiceActive ? `🎙 LISTENING — ${voiceStep?.toUpperCase() || ''}...` : '🎤 SPEAK YOUR COMMAND — VOICE MODE'}
                  </button>

                  {/* DIVIDER */}
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                    <div style={{ flex:1, height:1, background:'#00D4FF18' }} />
                    <span style={{ color:'#003366', fontSize:9, fontFamily:'monospace', letterSpacing:2 }}>OR TYPE BELOW</span>
                    <div style={{ flex:1, height:1, background:'#00D4FF18' }} />
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                    <div>
                      <div style={{ color:'#005588', fontSize:9, letterSpacing:2, marginBottom:7, fontFamily:'monospace' }}>COMPANY NAME</div>
                      <input className="inp" placeholder="Your company name..." value={companyName} onChange={e => setCompanyName(e.target.value)} />
                    </div>
                    <div>
                      <div style={{ color:'#005588', fontSize:9, letterSpacing:2, marginBottom:7, fontFamily:'monospace' }}>INDUSTRY</div>
                      <input className="inp" placeholder="e.g. SaaS, Fintech..." value={industry} onChange={e => setIndustry(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <div style={{ color:'#005588', fontSize:9, letterSpacing:2, marginBottom:7, fontFamily:'monospace' }}>YOUR EMAIL</div>
                    <input className="inp" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div style={{ marginBottom:22 }}>
                    <div style={{ color:'#005588', fontSize:9, letterSpacing:2, marginBottom:7, fontFamily:'monospace' }}>BOARDROOM COMMAND</div>
                    <textarea className="inp" rows={4} style={{ resize:'vertical' }} placeholder="e.g. We want to launch our B2B SaaS to 500 Indian companies in 90 days. Build the complete strategy." value={command} onChange={e => setCommand(e.target.value)} />
                  </div>
                  <button className="btn-big" onClick={runActivation} disabled={!companyName || !command}>⚡ INITIATE BOARDROOM SEQUENCE</button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                  {['7 AI EXECUTIVES','7 LIVE AGENTS','VOICE + COLD EMAIL'].map(t => (
                    <div key={t} className="panel" style={{ padding:'10px 8px', textAlign:'center' }}>
                      <div style={{ color:'#00D4FF66', fontSize:9, letterSpacing:1.5, fontFamily:'monospace' }}>{t}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ACTIVATING */}
          {phase === 'activating' && (
            <div className="fu" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:24 }}>
              <HolographicFace speaking={true} />
              <div className="panel" style={{ padding:28, maxWidth:500, width:'100%' }}>
                <div className="orb" style={{ color:'#00D4FF', fontSize:10, letterSpacing:3, textAlign:'center', marginBottom:20 }}>ACTIVATING NEURAL BOARDROOM...</div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {EXECUTIVES.map((e, i) => (
                    <div key={e.key} style={{ display:'flex', alignItems:'center', gap:10, fontFamily:'monospace', fontSize:12, color: i < activationStep ? e.color : '#002244', opacity: i < activationStep ? 1 : 0.3, transition:'all 0.4s' }}>
                      <div style={{ width:7, height:7, borderRadius:'50%', background: i < activationStep ? e.color : '#002244', boxShadow: i < activationStep ? `0 0 7px ${e.color}` : 'none', flexShrink:0 }} />
                      {e.name.toUpperCase()} — {e.title}
                      {i < activationStep && <span style={{ marginLeft:'auto', fontSize:9, letterSpacing:2 }}>🎤 ONLINE</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* BOARDROOM + DECISION */}
          {(phase === 'boardroom' || phase === 'decision') && (
            <div className="fu">
              <div className="panel" style={{ padding:'14px 20px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ color:'#004466', fontSize:9, letterSpacing:2, fontFamily:'monospace' }}>LIVE BOARDROOM — WORLD'S FIRST MULTI-AGENT AI</div>
                  <div className="orb" style={{ color:'#00D4FF', fontSize:13, fontWeight:700, marginTop:3 }}>{companyName} — {command.slice(0,55)}{command.length > 55 ? '…' : ''}</div>
                </div>
                {loading && <div style={{ display:'flex', alignItems:'center', gap:7 }}><div style={{ width:7, height:7, borderRadius:'50%', background:'#00D4FF', animation:'dpulse 1s infinite' }} /><span style={{ color:'#00D4FF', fontSize:10, fontFamily:'monospace', letterSpacing:2 }}>AI DEBATING...</span></div>}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14, marginBottom:24 }}>
                {EXECUTIVES.map((e, i) => <ExecCard key={e.key} exec={e} msg={boardResult?.discussion[i]} active={activeExec === i} />)}
              </div>
              {phase === 'decision' && boardResult && (
                <div className="fu panel" style={{ padding:28, border:'1px solid #00D4FF', boxShadow:'0 0 40px #00D4FF44' }}>
                  <div className="orb" style={{ color:'#00D4FF', fontSize:13, fontWeight:900, letterSpacing:2, marginBottom:16 }}>◈ BOARD HAS REACHED UNANIMOUS DECISION</div>
                  <button className="btn-voice" onClick={readDecisionAloud}>{readingDecision ? '🔊 READING...' : '🔊 READ AGAIN'}</button>
                  <div style={{ fontFamily:'monospace', fontSize:13, lineHeight:1.9, color:'#99ccee', marginBottom:20, whiteSpace:'pre-wrap' }}>{cleanText(boardResult.boardDecision)}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:24 }}>
                    {boardResult.actionItems.map((item, i) => (
                      <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                        <span className="orb" style={{ background:'#00D4FF22', color:'#00D4FF', border:'1px solid #00D4FF44', borderRadius:4, width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, flexShrink:0 }}>{i+1}</span>
                        <span style={{ fontFamily:'monospace', fontSize:12, color:'#AADDFF', lineHeight:1.8 }}>{cleanActionItem(item)}</span>
                      </div>
                    ))}
                  </div>
                  <button className="btn-big" onClick={runAgents}>🚀 EXECUTE ALL 7 AGENTS — DELIVER TO WORLD</button>
                </div>
              )}
            </div>
          )}

          {/* EXECUTING */}
          {phase === 'executing' && (
            <div className="fu">
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20, marginBottom:32 }}>
                <HolographicFace speaking={true} />
                <div className="panel" style={{ padding:'24px 36px', textAlign:'center', maxWidth:440 }}>
                  <pre className="orb" style={{ color:'#00D4FF', fontSize:14, fontWeight:700, letterSpacing:2, lineHeight:2, whiteSpace:'pre-wrap' }}>{missionText}<span style={{ display:'inline-block', width:8, height:16, background:'#00FFFF', marginLeft:3, verticalAlign:'middle', animation:'dpulse 0.8s infinite' }} /></pre>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:12 }}>
                {AGENT_INFO.map(a => <AgentPanel key={a.key} label={a.label} icon={a.icon} desc={a.desc} status={agentStatus[a.key as keyof AgentStatus]} link={agentLinks[a.key as keyof AgentLinks]} />)}
              </div>
            </div>
          )}

          {/* COMPLETE */}
          {phase === 'complete' && (
            <div className="fu" style={{ display:'flex', flexDirection:'column', gap:28 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
                <HolographicFace speaking={true} />
                <div className="panel" style={{ padding:'28px 36px', maxWidth:560, width:'100%', textAlign:'center', border:'1px solid #00D4FF', boxShadow:'0 0 55px #00D4FF55' }}>
                  <pre className="orb" style={{ color:'#00D4FF', fontSize:16, fontWeight:900, letterSpacing:3, lineHeight:1.9, whiteSpace:'pre-wrap', textShadow:'0 0 20px #00D4FF', marginBottom:20 }}>{missionText}</pre>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:8, marginBottom:16 }}>
                    {AGENT_INFO.map(a => (
                      <div key={a.key} className="panel" style={{ padding:'8px 12px', display:'flex', alignItems:'center', gap:6 }}>
                        <span>{a.icon}</span>
                        <span style={{ color: agentStatus[a.key as keyof AgentStatus] === 'done' ? '#00FFAA' : '#FF5555', fontSize:9, fontFamily:'monospace' }}>
                          {agentStatus[a.key as keyof AgentStatus] === 'done' ? '✓' : '✗'} {a.label.replace(' AGENT','').replace(' COLD EMAIL','')}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button className="btn" onClick={resetAll}>↩ NEW SESSION</button>
                </div>
              </div>

              {leads.length > 0 && (
                <div className="panel" style={{ padding:24 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                    <div className="orb" style={{ color:'#00D4FF', fontSize:11, letterSpacing:3 }}>🎯 AI GENERATED LEADS — {leads.length} PROSPECTS</div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:7, height:7, borderRadius:'50%', background: agentStatus.coldEmail === 'done' ? '#00FFAA' : '#FF5555', boxShadow: `0 0 6px ${agentStatus.coldEmail === 'done' ? '#00FFAA' : '#FF5555'}` }} />
                      <span className="orb" style={{ color: agentStatus.coldEmail === 'done' ? '#00FFAA' : '#FF5555', fontSize:9 }}>
                        {agentStatus.coldEmail === 'done' ? '✓ DEEPAK EMAILED ALL LEADS' : 'EMAIL PENDING'}
                      </span>
                    </div>
                  </div>
                  <div style={{ overflowX:'auto' }}>
                    <table>
                      <thead><tr><th>NAME</th><th>COMPANY</th><th>ROLE</th><th>EMAIL</th><th>REASON</th><th>LINKEDIN</th></tr></thead>
                      <tbody>
                        {leads.map((lead, i) => (
                          <tr key={i}>
                            <td style={{ color:'#00D4FF' }}>{lead.name}</td>
                            <td>{lead.company}</td>
                            <td>{lead.role}</td>
                            <td>{lead.email}</td>
                            <td style={{ maxWidth:200 }}>{lead.reason}</td>
                            <td><a href={lead.linkedin} target="_blank" rel="noreferrer" style={{ color:'#0099FF' }}>→ CONNECT</a></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {linkedinPost && (
                <div className="panel" style={{ padding:24 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                    <div className="orb" style={{ color:'#0099FF', fontSize:11, letterSpacing:3 }}>💼 LINKEDIN POST — READY TO PUBLISH</div>
                    <button className="btn-copy" onClick={() => { navigator.clipboard.writeText(linkedinPost); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                      {copied ? '✓ COPIED!' : '📋 COPY POST'}
                    </button>
                  </div>
                  <div style={{ fontFamily:'monospace', fontSize:12, lineHeight:1.9, color:'#88aacc', whiteSpace:'pre-wrap', background:'rgba(0,30,80,0.5)', padding:16, borderRadius:6, border:'1px solid #0033aa' }}>
                    {linkedinPost}
                  </div>
                  <div style={{ marginTop:12, fontFamily:'monospace', fontSize:10, color:'#334466' }}>Copy this post and paste it directly on LinkedIn.</div>
                </div>
              )}

              <div style={{ color:'#002244', fontSize:10, fontFamily:'monospace', textAlign:'center' }}>
                WORLD'S FIRST MULTI-AGENT AI BOARDROOM OS — VISHWAKARMAAI.COM<br />
                INVENTED BY ANUBHAB ROY — AGARTALA, TRIPURA, INDIA 🇮🇳
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));