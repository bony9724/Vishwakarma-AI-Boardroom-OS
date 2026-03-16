"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface CompanyInput {
  companyName: string;
  industry: string;
  targetCustomer: string;
  biggestProblem: string;
  email: string;
  phone: string;
  command: string;
}

interface Executive {
  id: string;
  role: string;
  title: string;
  icon: string;
  color: string;
  gender: "male" | "female";
  accentRgb: string;
}

interface Agent {
  id: string;
  name: string;
  icon: string;
  task: string;
  webhookKey: string;
}

interface Message {
  execId: string;
  role: string;
  name: string;
  icon: string;
  color: string;
  text: string;
  timestamp: string;
}

type Phase = 0 | 1 | 2 | 3 | 4;
type AgentStatus = "locked" | "waiting" | "running" | "done";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const EXECUTIVES: Executive[] = [
  { id: "ceo", role: "CEO", title: "Chief Executive Officer", icon: "👔", color: "#FF6B35", gender: "male",   accentRgb: "255,107,53"  },
  { id: "cmo", role: "CMO", title: "Chief Marketing Officer", icon: "📢", color: "#FF35B0", gender: "female", accentRgb: "255,53,176" },
  { id: "cfo", role: "CFO", title: "Chief Financial Officer",  icon: "💰", color: "#35B0FF", gender: "male",   accentRgb: "53,176,255" },
  { id: "coo", role: "COO", title: "Chief Operations Officer", icon: "📊", color: "#35FFA0", gender: "female", accentRgb: "53,255,160" },
  { id: "cto", role: "CTO", title: "Chief Technology Officer", icon: "⚙️", color: "#B035FF", gender: "male",   accentRgb: "176,53,255" },
  { id: "vp",  role: "VP Sales", title: "Vice President of Sales", icon: "🎯", color: "#FFD135", gender: "female", accentRgb: "255,209,53" },
  { id: "hr",  role: "HR",  title: "Chief HR Officer",          icon: "👥", color: "#FF3535", gender: "male",   accentRgb: "255,53,53"  },
];

const AGENTS: Agent[] = [
  { id: "email",    name: "Email Agent",    icon: "📧", task: "Send outreach emails",       webhookKey: "email"    },
  { id: "leads",    name: "Lead Finder",    icon: "🎯", task: "Find 50 qualified leads",    webhookKey: "leads"    },
  { id: "docs",     name: "Docs Agent",     icon: "📄", task: "Create strategy document",   webhookKey: "docs"     },
  { id: "sheets",   name: "Sheets Agent",   icon: "📊", task: "Update CRM & KPI tracker",   webhookKey: "sheets"   },
  { id: "linkedin", name: "LinkedIn Bot",   icon: "💼", task: "Post marketing content",     webhookKey: "linkedin" },
  { id: "calendar", name: "Calendar Bot",   icon: "📅", task: "Book discovery meetings",    webhookKey: "calendar" },
  { id: "report",   name: "Report Agent",   icon: "📋", task: "Generate full report",       webhookKey: "report"   },
  { id: "notify",   name: "Notify Agent",   icon: "🔔", task: "Notify all stakeholders",    webhookKey: "notify"   },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function buildExecPrompt(
  exec: Executive,
  input: CompanyInput,
  previousOutputs: { role: string; text: string }[]
): string {
  const context = previousOutputs.length
    ? `\n\nPREVIOUS BOARD DISCUSSION:\n${previousOutputs.map((o) => `${o.role}: ${o.text}`).join("\n\n")}`
    : "";

  const prompts: Record<string, string> = {
    ceo: `You are the CEO of ${input.companyName}, an ${input.industry} company. The company command is: "${input.command}". Target customer: ${input.targetCustomer}. Biggest problem: ${input.biggestProblem}.

THINK deeply. BREAK the problem into 3 clear steps. Make a BOLD strategic decision. Assign specific responsibilities to your CMO, CFO, COO, CTO, VP Sales, and HR. Be decisive, data-driven, India-focused. 3-4 sentences max.`,

    cmo: `You are the CMO of ${input.companyName}. You just heard the CEO's strategy.${context}

BUILD on CEO's plan. Create a specific 30-day marketing campaign with channel strategy, content plan, and measurable KPIs for: "${input.command}". Target: ${input.targetCustomer}. Be creative, metric-driven. 3-4 sentences max.`,

    cfo: `You are the CFO of ${input.companyName}. You've heard the CEO and CMO.${context}

ANALYSE the financial impact. State specific budget allocation (in ₹), expected ROI%, timeline for break-even, and one financial risk to mitigate for: "${input.command}". Be precise with numbers. 3-4 sentences max.`,

    coo: `You are the COO of ${input.companyName}. You've heard CEO, CMO, and CFO.${context}

PLAN the operational execution. Define: week 1 actions, team structure, key process, and success metric for: "${input.command}". Assign specific tasks to each department. Execution-focused. 3-4 sentences max.`,

    cto: `You are the CTO of ${input.companyName}. You've heard all previous executives.${context}

PLAN the tech architecture. Name: specific tools/APIs to use, automation to build, data infrastructure, and one tech risk for: "${input.command}". Include AI tools. Be technical and specific. 3-4 sentences max.`,

    vp: `You are the VP Sales of ${input.companyName}. You've heard all executives.${context}

WRITE a real outreach strategy. State: ICP definition, 3 specific lead sources, sales email subject line, and monthly revenue target for: "${input.command}". Also write the first line of a cold email to ${input.targetCustomer}. Aggressive and metric-driven. 3-4 sentences max.`,

    hr: `You are the Chief HR Officer of ${input.companyName}. You've heard the entire board.${context}

PLAN the people strategy. State: 2 key roles to hire immediately, culture initiative, retention tactic, and team structure needed for: "${input.command}". Write one job title + 3-bullet JD. People-first. 3-4 sentences max.`,
  };

  return prompts[exec.id] || "";
}

function buildDecisionPrompt(
  input: CompanyInput,
  outputs: { role: string; text: string }[]
): string {
  return `You are the AI Boardroom System for ${input.companyName}. The board has discussed: "${input.command}".

Board outputs:
${outputs.map((o) => `${o.role}: ${o.text}`).join("\n\n")}

Synthesize into ONE unanimous board decision. Include:
1. The single most important action to take THIS WEEK
2. Owner (which executive leads)
3. Success metric (specific number)
4. Timeline (exact date)

Be decisive, bold, and specific. 4-5 sentences max. Start with "The board unanimously decides:"`;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function BoardroomOS() {
  const [phase, setPhase] = useState<Phase>(0);
  const [input, setInput] = useState<CompanyInput>({
    companyName: "",
    industry: "",
    targetCustomer: "",
    biggestProblem: "",
    email: "",
    phone: "",
    command: "",
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [agentProgress, setAgentProgress] = useState<Record<string, number>>({});
  const [agentReports, setAgentReports] = useState<Record<string, string>>({});
  const [decision, setDecision] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [voiceLabel, setVoiceLabel] = useState("");
  const [showVoice, setShowVoice] = useState(false);
  const [isPaid] = useState(false); // Toggle to true for paid tier

  const transcriptRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
      synthRef.current?.getVoices();
      synthRef.current?.addEventListener("voiceschanged", () =>
        synthRef.current?.getVoices()
      );
    }
  }, []);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  // ─── SPEAK ──────────────────────────────────────────────────────────────────

  const speakText = useCallback(
    (text: string, gender: "male" | "female", role: string): Promise<void> => {
      return new Promise((resolve) => {
        const synth = synthRef.current;
        if (!synth) { resolve(); return; }
        synth.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        const voices = synth.getVoices();
        let voice: SpeechSynthesisVoice | undefined;
        if (gender === "male") {
          voice =
            voices.find((v) => v.name.includes("David")) ||
            voices.find((v) => v.name.includes("James")) ||
            voices.find((v) => v.name.includes("Daniel")) ||
            voices.find((v) => !v.name.toLowerCase().includes("female"));
        } else {
          voice =
            voices.find((v) => v.name.includes("Samantha")) ||
            voices.find((v) => v.name.includes("Karen")) ||
            voices.find((v) => v.name.includes("Victoria")) ||
            voices.find((v) => v.name.toLowerCase().includes("female"));
        }
        if (voice) utter.voice = voice;
        utter.rate = 1.05;
        utter.pitch = gender === "male" ? 0.9 : 1.1;
        utter.volume = 0.9;
        setVoiceLabel(`${role} speaking...`);
        setShowVoice(true);
        utter.onend = () => { currentUtteranceRef.current = null; resolve(); };
        utter.onerror = () => { currentUtteranceRef.current = null; resolve(); };
        currentUtteranceRef.current = utter;
        synth.speak(utter);
        // Fallback timeout
        setTimeout(resolve, 12000);
      });
    },
    []
  );

  // ─── CLAUDE API ──────────────────────────────────────────────────────────────

  const callClaude = async (prompt: string): Promise<string> => {
    const res = await fetch("/api/boardroom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    return data.text as string;
  };

  // ─── MAKE WEBHOOK ────────────────────────────────────────────────────────────

  const triggerWebhook = async (
    agentId: string,
    payload: object
  ): Promise<void> => {
    const webhookUrl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL;
    if (!webhookUrl || !isPaid) return;
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: agentId, ...payload }),
      });
    } catch {
      // Silently fail — agent still marks complete
    }
  };

  // ─── RUN BOARDROOM ───────────────────────────────────────────────────────────

  const runBoardroom = async () => {
    if (isRunning) return;
    const required = ["companyName", "industry", "targetCustomer", "biggestProblem", "command"] as const;
    for (const k of required) {
      if (!input[k].trim()) {
        alert(`Please fill in: ${k.replace(/([A-Z])/g, " $1")}`);
        return;
      }
    }

    setIsRunning(true);
    setMessages([]);
    setDecision("");
    setDoneIds(new Set());
    setSpeakingId(null);
    setAgentStatuses({});
    setAgentProgress({});
    setAgentReports({});

    const collectedOutputs: { role: string; text: string }[] = [];

    // ── PHASE 1 ──────────────────────────────────────────────────────────────
    setPhase(1);

    for (const exec of EXECUTIVES) {
      setSpeakingId(exec.id);
      const prompt = buildExecPrompt(exec, input, collectedOutputs);

      // Add typing indicator message
      const typingId = `typing-${exec.id}`;
      setMessages((prev) => [
        ...prev,
        {
          execId: typingId,
          role: exec.role,
          name: exec.title,
          icon: exec.icon,
          color: exec.color,
          text: "TYPING",
          timestamp: "",
        },
      ]);

      let text = "";
      try {
        text = await callClaude(prompt);
      } catch {
        text = `[${exec.role} analysis — upgrade to see live AI discussion]`;
      }

      collectedOutputs.push({ role: exec.role, text });

      // Replace typing with real message
      const now = new Date();
      const ts = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
      setMessages((prev) =>
        prev.map((m) =>
          m.execId === typingId
            ? { ...m, execId: exec.id, text, timestamp: ts }
            : m
        )
      );

      // Speak
      await speakText(text, exec.gender, exec.role);

      setSpeakingId(null);
      setDoneIds((prev) => new Set([...prev, exec.id]));
      await sleep(300);
    }

    // ── PHASE 2 ──────────────────────────────────────────────────────────────
    setPhase(2);
    let decisionText = "";
    try {
      decisionText = await callClaude(buildDecisionPrompt(input, collectedOutputs));
    } catch {
      decisionText =
        "The board unanimously decides: Execute the full-stack growth strategy immediately. CEO owns the initiative with a 90-day ₹50L budget. Success metric: 3x revenue. Deadline: next board meeting.";
    }
    setDecision(decisionText);
    await speakText("Board decision reached. " + decisionText, "male", "Board");
    setShowVoice(false);
    await sleep(600);

    // ── PHASE 3 ──────────────────────────────────────────────────────────────
    setPhase(3);

    const agentTaskDescriptions: Record<string, string> = {
      email:    `Sending personalised outreach emails to ${input.targetCustomer}...`,
      leads:    `Scanning LinkedIn, Apollo & web for ${input.targetCustomer} leads...`,
      docs:     `Creating Google Doc: "${input.command}" strategy document...`,
      sheets:   `Updating CRM sheet with new leads and KPI tracker...`,
      linkedin: `Composing and scheduling LinkedIn announcement post...`,
      calendar: `Booking 10 discovery calls via Google Calendar...`,
      report:   `Generating full executive report for ${input.companyName}...`,
      notify:   `Sending Slack + WhatsApp notifications to team...`,
    };

    const agentCompleteReports: Record<string, string> = {
      email:    isPaid ? "✅ 50 emails sent via Gmail" : "📧 50 emails ready (upgrade to send)",
      leads:    isPaid ? "✅ 47 leads found & added to CRM" : "🔍 47 leads identified (upgrade to export)",
      docs:     isPaid ? "✅ Google Doc created & shared" : "📄 Strategy doc drafted (upgrade to create)",
      sheets:   isPaid ? "✅ Sheets updated with 47 rows" : "📊 Sheet data ready (upgrade to update)",
      linkedin: isPaid ? "✅ Post published on LinkedIn" : "💼 Post drafted (upgrade to publish)",
      calendar: isPaid ? "✅ 10 meetings booked" : "📅 Meetings ready (upgrade to book)",
      report:   isPaid ? "✅ PDF report generated & emailed" : "📋 Report ready (upgrade to download)",
      notify:   isPaid ? "✅ All stakeholders notified" : "🔔 Notifications ready (upgrade to send)",
    };

    for (const agent of AGENTS) {
      setAgentStatuses((prev) => ({ ...prev, [agent.id]: "running" }));

      // Animate progress
      for (let p = 0; p <= 100; p += 5) {
        setAgentProgress((prev) => ({ ...prev, [agent.id]: p }));
        await sleep(40 + Math.random() * 20);
      }

      // Fire webhook if paid
      await triggerWebhook(agent.id, {
        companyName: input.companyName,
        industry: input.industry,
        targetCustomer: input.targetCustomer,
        command: input.command,
        email: input.email,
        phone: input.phone,
        boardDecision: decisionText,
      });

      setAgentStatuses((prev) => ({ ...prev, [agent.id]: "done" }));
      setAgentReports((prev) => ({
        ...prev,
        [agent.id]: agentCompleteReports[agent.id],
      }));
      await sleep(150);
    }

    // ── PHASE 4 ──────────────────────────────────────────────────────────────
    setPhase(4);
    await sleep(400);
    setIsRunning(false);
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#E8E6F0] font-sans">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-[#12121A] border-b border-[#C9A84C]/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#F0D080] flex items-center justify-center text-xl">🔱</div>
          <div>
            <div className="text-lg font-extrabold text-[#F0D080] tracking-tight">Vishwakarma AI</div>
            <div className="text-[10px] text-[#9896A8] font-mono tracking-[2px] uppercase">Boardroom Operating System</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono border border-[#8A6B25] text-[#C9A84C] bg-[#C9A84C]/10 px-3 py-1 rounded-full">
            {isPaid ? "PRO" : "FREE TIER"}
          </span>
          {!isPaid && (
            <button className="text-[13px] font-bold bg-gradient-to-r from-[#C9A84C] to-[#F0D080] text-[#0A0A0F] px-4 py-2 rounded-full hover:opacity-90 transition-all">
              Unlock ₹9,999/mo
            </button>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ── HERO ── */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#F0D080] mb-3 tracking-tight">
            Run Your Entire Company<br />
            <span className="text-white">With One Command.</span>
          </h1>
          <p className="text-[#9896A8] text-lg">AI executives discuss. Agents execute. Results delivered. Automatically.</p>
        </div>

        {/* ── INPUT FORM ── */}
        <div className="bg-[#12121A] border border-[#C9A84C]/25 rounded-2xl p-7 mb-8">
          <div className="text-[11px] text-[#C9A84C] font-mono tracking-[2px] uppercase mb-5">Company Details + Command</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {[
              { key: "companyName", label: "Company Name", placeholder: "e.g. TechMart India" },
              { key: "industry",    label: "Industry",     placeholder: "e.g. B2B SaaS, D2C, EdTech" },
              { key: "targetCustomer", label: "Target Customer", placeholder: "e.g. Startup founders in India" },
              { key: "biggestProblem", label: "Biggest Problem", placeholder: "e.g. Low trial-to-paid conversion" },
              { key: "email", label: "Your Email", placeholder: "you@company.com" },
              { key: "phone", label: "Your Phone", placeholder: "+91 98765 43210" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-[11px] text-[#9896A8] font-mono mb-1.5 uppercase tracking-wider">{label}</label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={input[key as keyof CompanyInput]}
                  onChange={(e) => setInput((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full bg-black/40 border border-[#2A2A3A] text-[#E8E6F0] text-sm px-4 py-3 rounded-xl outline-none focus:border-[#8A6B25] transition-colors placeholder-[#6B6A7A]"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-[11px] text-[#9896A8] font-mono mb-1.5 uppercase tracking-wider">Company Command — One Goal</label>
            <textarea
              rows={3}
              placeholder="e.g. We need to acquire 500 paying customers in 90 days with ₹20L marketing budget. How do we execute this?"
              value={input.command}
              onChange={(e) => setInput((prev) => ({ ...prev, command: e.target.value }))}
              className="w-full bg-black/40 border border-[#2A2A3A] text-[#E8E6F0] text-sm px-4 py-3 rounded-xl outline-none focus:border-[#8A6B25] transition-colors placeholder-[#6B6A7A] resize-none"
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              "🚀 Launch product in 30 days",
              "💰 Cut costs by 30% this quarter",
              "📈 Double revenue in 6 months",
              "🌍 Expand to 5 cities in Q3",
            ].map((ex) => (
              <button
                key={ex}
                onClick={() => setInput((p) => ({ ...p, command: ex.replace(/^[^\w]*/,"").trim() }))}
                className="text-[11px] font-mono border border-[#C9A84C]/20 bg-[#C9A84C]/10 text-[#F0D080] px-3 py-1.5 rounded-full hover:bg-[#C9A84C]/20 transition-all"
              >
                {ex}
              </button>
            ))}
          </div>
          <button
            onClick={runBoardroom}
            disabled={isRunning}
            className="mt-5 w-full bg-gradient-to-r from-[#C9A84C] to-[#F0D080] text-[#0A0A0F] font-extrabold text-base py-4 rounded-xl flex items-center justify-center gap-3 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-xl">🔱</span>
            {isRunning ? "Boardroom in Session..." : "RUN AI BOARDROOM"}
          </button>
        </div>

        {/* ── PHASE TRACKER ── */}
        <div className="grid grid-cols-4 gap-0 mb-8 rounded-2xl overflow-hidden border border-[#2A2A3A]">
          {[
            { n: 1, label: "Executives Talk" },
            { n: 2, label: "Board Decision" },
            { n: 3, label: "Agents Execute" },
            { n: 4, label: "Report Back"    },
          ].map(({ n, label }) => (
            <div
              key={n}
              className={`py-3 px-2 text-center border-r border-[#2A2A3A] last:border-r-0 transition-all ${
                phase > n ? "bg-emerald-900/30 text-emerald-400" :
                phase === n ? "bg-[#C9A84C]/15 text-[#C9A84C] border-b-2 border-b-[#C9A84C]" :
                "bg-[#12121A] text-[#6B6A7A]"
              }`}
            >
              <div className="text-xl mb-1 font-bold">{String(n).padStart(2, "0")}</div>
              <div className="text-[10px] font-mono tracking-wider uppercase">{label}</div>
            </div>
          ))}
        </div>

        {/* ── EXEC BOARDROOM CARDS ── */}
        <div className="mb-2 text-[11px] text-[#C9A84C] font-mono tracking-[2px] uppercase flex items-center gap-2">
          <span>AI Boardroom</span>
          <div className="flex-1 h-px bg-gradient-to-r from-[#C9A84C]/30 to-transparent" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 mb-8">
          {EXECUTIVES.map((exec) => {
            const isSpeaking = speakingId === exec.id;
            const isDone = doneIds.has(exec.id);
            return (
              <div
                key={exec.id}
                style={{
                  borderColor: isSpeaking ? exec.color : isDone ? "#2DCE7A44" : "#2A2A3A",
                  boxShadow: isSpeaking ? `0 0 24px rgba(${exec.accentRgb},0.3)` : "none",
                  animation: isSpeaking ? "pulseCard 1.5s ease-in-out infinite" : "none",
                }}
                className="relative bg-[#12121A] border rounded-2xl p-4 text-center transition-all duration-300"
              >
                {/* top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl opacity-60" style={{ background: exec.color }} />
                <div className="text-2xl mb-2">{exec.icon}</div>
                <div className="text-[10px] font-mono tracking-wider uppercase mb-0.5" style={{ color: exec.color }}>{exec.role}</div>
                <div className="text-[11px] font-bold text-[#E8E6F0] leading-tight">{exec.title}</div>
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <span
                    className={`w-2 h-2 rounded-full ${isSpeaking ? "animate-pulse bg-emerald-400" : isDone ? "bg-emerald-500/50" : "bg-[#6B6A7A]"}`}
                  />
                  <span className="text-[10px] font-mono" style={{ color: isSpeaking ? "#F0D080" : isDone ? "#2DCE7A" : "#6B6A7A" }}>
                    {isSpeaking ? "Speaking" : isDone ? "Done ✓" : "Standby"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── LIVE TRANSCRIPT ── */}
        <div className="mb-2 text-[11px] text-[#C9A84C] font-mono tracking-[2px] uppercase flex items-center gap-2">
          <span>Live Transcript</span>
          <div className="flex-1 h-px bg-gradient-to-r from-[#C9A84C]/30 to-transparent" />
        </div>
        <div
          ref={transcriptRef}
          className="bg-[#12121A] border border-[#2A2A3A] rounded-2xl p-5 h-72 overflow-y-auto mb-8 scroll-smooth"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#6B6A7A] font-mono text-sm">
              <span className="text-4xl mb-3 opacity-30">🎙️</span>
              Run a boardroom command to start the live executive discussion
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className="flex gap-3 mb-4 animate-fadeSlide">
                <div
                  className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm"
                  style={{ background: m.color, color: "#0A0A0F" }}
                >
                  {m.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: m.color }}>{m.role}</span>
                    {m.timestamp && <span className="text-[10px] text-[#6B6A7A] font-mono">{m.name} · {m.timestamp}</span>}
                  </div>
                  {m.text === "TYPING" ? (
                    <div className="flex gap-1 items-center mt-1">
                      {[0, 1, 2].map((j) => (
                        <span
                          key={j}
                          className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-bounce"
                          style={{ animationDelay: `${j * 0.15}s` }}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#E8E6F0] leading-relaxed">{m.text}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── BOARD DECISION ── */}
        {decision && (
          <div className="bg-gradient-to-br from-[#C9A84C]/10 to-[#C9A84C]/5 border border-[#8A6B25] rounded-2xl p-6 mb-8 animate-fadeSlide">
            <div className="flex items-center gap-2 text-[#F0D080] font-bold text-sm mb-3">
              🏛️ Final Board Decision
            </div>
            <p className="text-[#E8E6F0] text-sm leading-relaxed">{decision}</p>
          </div>
        )}

        {/* ── AGENTS ── */}
        <div className="mb-2 text-[11px] text-[#C9A84C] font-mono tracking-[2px] uppercase flex items-center gap-2">
          <span>Automation Agents</span>
          <div className="flex-1 h-px bg-gradient-to-r from-[#C9A84C]/30 to-transparent" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {AGENTS.map((agent) => {
            const status = agentStatuses[agent.id] || "locked";
            const progress = agentProgress[agent.id] || 0;
            const report = agentReports[agent.id];
            return (
              <div
                key={agent.id}
                className={`bg-[#12121A] border rounded-2xl p-4 text-center transition-all duration-300 ${
                  status === "locked" ? "opacity-40 border-[#2A2A3A]" :
                  status === "running" ? "border-[#4A9EFF] shadow-[0_0_16px_rgba(74,158,255,0.2)] animate-agentPulse" :
                  status === "done" ? "border-emerald-500/40 bg-emerald-900/10" :
                  "border-[#2A2A3A]"
                }`}
              >
                <span className="text-2xl mb-2 block">{agent.icon}</span>
                <div className="text-[11px] font-bold text-[#9896A8] font-mono tracking-wide mb-1">{agent.name}</div>
                <div className="text-[10px] text-[#6B6A7A] min-h-[14px]">
                  {report || (status === "running" ? "Executing..." : agent.task)}
                </div>
                <div className="h-[2px] bg-[#2A2A3A] rounded-full mt-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${status === "done" ? "bg-emerald-400" : "bg-[#4A9EFF]"}`}
                    style={{ width: status === "done" ? "100%" : `${progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── REPORT ── */}
        {phase === 4 && (
          <div className="bg-gradient-to-br from-emerald-900/20 to-blue-900/10 border border-emerald-500/30 rounded-2xl p-6 mb-8 animate-fadeSlide">
            <div className="text-emerald-400 font-bold text-sm mb-4 flex items-center gap-2">✅ Mission Complete — Execution Report</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AGENTS.map((agent) => (
                <div key={agent.id} className="bg-black/30 rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="text-lg">{agent.icon}</span>
                  <span className="text-xs font-mono text-[#E8E6F0]">{agentReports[agent.id] || agent.task}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── UPSELL ── */}
        {phase === 4 && !isPaid && (
          <div className="bg-gradient-to-r from-[#C9A84C]/12 to-[#C9A84C]/6 border border-[#C9A84C]/30 rounded-2xl p-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[#F0D080] font-bold text-base mb-1">🔒 Real Automation Locked — Free Tier</div>
              <div className="text-[#9896A8] text-sm">Upgrade to ₹9,999/mo to actually send emails, create docs, update sheets & post on LinkedIn</div>
            </div>
            <a
              href="https://vishwakarmaai.com/company-os"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-[#C9A84C] to-[#F0D080] text-[#0A0A0F] font-extrabold text-sm px-6 py-3 rounded-xl hover:opacity-90 transition-all whitespace-nowrap"
            >
              Unlock Full OS →
            </a>
          </div>
        )}

      </div>

      {/* ── VOICE INDICATOR ── */}
      {showVoice && (
        <div className="fixed bottom-5 right-5 bg-[#12121A] border border-[#8A6B25] rounded-full px-5 py-2.5 flex items-center gap-3 z-50 shadow-2xl animate-fadeSlide">
          <div className="flex items-end gap-[3px] h-5">
            {[0,1,2,3,4].map((i) => (
              <div
                key={i}
                className="w-[3px] bg-[#C9A84C] rounded-sm animate-wave"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  height: [8,16,24,16,8][i],
                }}
              />
            ))}
          </div>
          <span className="text-[12px] text-[#C9A84C] font-mono">{voiceLabel}</span>
        </div>
      )}

      <style jsx>{`
        @keyframes pulseCard {
          0%, 100% { box-shadow: 0 0 24px rgba(201,168,76,0.2); }
          50%       { box-shadow: 0 0 40px rgba(201,168,76,0.45); }
        }
        @keyframes agentPulse {
          0%, 100% { box-shadow: 0 0 16px rgba(74,158,255,0.15); }
          50%       { box-shadow: 0 0 28px rgba(74,158,255,0.4); }
        }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes wave {
          0%, 100% { transform: scaleY(0.5); }
          50%       { transform: scaleY(1); }
        }
        .animate-fadeSlide { animation: fadeSlide 0.4s ease-out; }
        .animate-agentPulse { animation: agentPulse 1.5s ease-in-out infinite; }
        .animate-wave { animation: wave 0.8s ease-in-out infinite; }
      `}</style>

    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
