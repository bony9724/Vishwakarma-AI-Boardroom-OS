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
  rate: number;
  pitch: number;
}

interface Message {
  execId: string;
  role: string;
  title: string;
  icon: string;
  color: string;
  text: string;
  timestamp: string;
  isTyping?: boolean;
  isThinking?: boolean;
}

interface AgentOutput {
  id: string;
  name: string;
  icon: string;
  status: "locked" | "running" | "done";
  progress: number;
  output: string;
  outputType: "email" | "table" | "doc" | "crm" | "linkedin" | "calendar" | "report" | "notify";
}

type Phase = 0 | 1 | 2 | 3 | 4;

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const EXECUTIVES: Executive[] = [
  { id: "ceo", role: "CEO", title: "Chief Executive Officer",    icon: "👔", color: "#FF6B35", gender: "male",   rate: 0.9,  pitch: 0.8  },
  { id: "cmo", role: "CMO", title: "Chief Marketing Officer",    icon: "📢", color: "#FF35B0", gender: "female", rate: 0.95, pitch: 1.2  },
  { id: "cfo", role: "CFO", title: "Chief Financial Officer",    icon: "💰", color: "#35B0FF", gender: "male",   rate: 0.85, pitch: 0.85 },
  { id: "coo", role: "COO", title: "Chief Operations Officer",   icon: "📊", color: "#35FFA0", gender: "female", rate: 0.9,  pitch: 1.15 },
  { id: "cto", role: "CTO", title: "Chief Technology Officer",   icon: "⚙️", color: "#B035FF", gender: "male",   rate: 0.9,  pitch: 0.9  },
  { id: "vp",  role: "VP Sales", title: "VP of Sales",           icon: "🎯", color: "#FFD135", gender: "female", rate: 1.0,  pitch: 1.1  },
  { id: "hr",  role: "HR",  title: "Chief HR Officer",           icon: "👥", color: "#FF3535", gender: "male",   rate: 0.9,  pitch: 0.95 },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function splitIntoChunks(text: string, wordLimit = 200): string[] {
  const words = text.split(" ");
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += wordLimit) {
    chunks.push(words.slice(i, i + wordLimit).join(" "));
  }
  return chunks;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildExecPrompt(
  exec: Executive,
  input: CompanyInput,
  previousOutputs: { role: string; text: string }[]
): string {
  const prevContext = previousOutputs.length
    ? `\n\nPREVIOUS BOARD DISCUSSION — READ THIS CAREFULLY AND RESPOND TO IT:\n${previousOutputs.map((o) => `\n[${o.role}]: ${o.text}`).join("\n")}\n\nYou MUST directly address what the previous executives said. Use phrases like "Building on the CEO's strategy...", "As the CFO noted about the budget...", etc.`
    : "";

  const rolePrompts: Record<string, string> = {
    ceo: `You are the CEO of ${input.companyName}, a ${input.industry} company. 

The board command is: "${input.command}"
Target customer: ${input.targetCustomer}
Biggest problem: ${input.biggestProblem}
${prevContext}

As CEO, you speak FIRST. Set the strategic direction:
1. THINK through the challenge step by step
2. DECIDE on the top 3 strategic priorities
3. ASSIGN specific responsibilities to CMO, CFO, COO, CTO, VP Sales, HR
4. State ONE clear success metric with a specific number
5. Give a bold autonomous decision

Be specific to ${input.industry}. Maximum 280 words. End with: "I'm passing this to our CMO to execute the marketing strategy."`,

    cmo: `You are the CMO of ${input.companyName}, a ${input.industry} company.
${prevContext}

The board command: "${input.command}"
Target customer: ${input.targetCustomer}

IMPORTANT: Start by directly addressing the CEO's strategy. Say exactly what marketing actions you will take to execute their vision.

1. Reference the CEO's specific points
2. Create a 30-day marketing campaign with specific channels
3. State budget needed (in ₹)
4. Give 3 specific tactics for ${input.targetCustomer}
5. Define KPIs with exact numbers

Maximum 280 words. End with: "I'm passing to our CFO for financial planning."`,

    cfo: `You are the CFO of ${input.companyName}, a ${input.industry} company.
${prevContext}

The board command: "${input.command}"

IMPORTANT: Start by addressing both the CEO's strategy AND the CMO's marketing plan. Calculate the exact financial impact.

1. Reference CEO and CMO outputs specifically
2. State total budget required in ₹
3. Expected ROI percentage and timeline
4. Break-even analysis
5. One financial risk and mitigation

Maximum 280 words. End with: "I'm passing to our COO for operational execution."`,

    coo: `You are the COO of ${input.companyName}, a ${input.industry} company.
${prevContext}

The board command: "${input.command}"

IMPORTANT: Build on CEO strategy, CMO campaign, and CFO budget. Plan the operations.

1. Reference previous executives directly
2. Week 1 action plan (specific tasks)
3. Team structure needed
4. Process workflow
5. Success metric

Maximum 280 words. End with: "I'm passing to our CTO for tech requirements."`,

    cto: `You are the CTO of ${input.companyName}, a ${input.industry} company.
${prevContext}

The board command: "${input.command}"

IMPORTANT: Address what CEO, CMO, CFO and COO said. Plan the technical architecture.

1. Reference operational needs from COO
2. Specific tech stack and tools
3. Automation to build
4. Timeline for tech delivery
5. One tech risk and solution

Maximum 280 words. End with: "I'm passing to our VP Sales for revenue execution."`,

    vp: `You are the VP Sales of ${input.companyName}, a ${input.industry} company.
${prevContext}

The board command: "${input.command}"
Target customer: ${input.targetCustomer}

IMPORTANT: Build on all previous executives. Create the sales execution plan.

1. Reference CEO strategy and CTO tools available
2. ICP definition (specific profile of ${input.targetCustomer})
3. Write the ACTUAL first line of a cold email (in quotes)
4. 3 specific lead sources
5. Monthly revenue target in ₹

Maximum 280 words. End with: "I'm passing to HR for team building."`,

    hr: `You are the Chief HR Officer of ${input.companyName}, a ${input.industry} company.
${prevContext}

The board command: "${input.command}"

IMPORTANT: This is your final input. Address ALL previous executives. Complete the board discussion.

1. Reference the entire board's strategy
2. Immediate hiring needs (2 specific roles with titles)
3. Write one actual job description bullet point
4. Team culture initiative
5. Timeline for hiring

Maximum 280 words. Close with: "The board is now ready to make its final decision."`,
  };

  return rolePrompts[exec.id] || "";
}

// ─── AGENT OUTPUT GENERATORS ─────────────────────────────────────────────────

function generateAgentPrompt(agentId: string, input: CompanyInput, execOutputs: Record<string, string>): string {
  const prompts: Record<string, string> = {
    email: `Generate a real personalized outreach email for ${input.companyName} targeting ${input.targetCustomer}.
Based on VP Sales strategy: ${execOutputs.vp || ""}
Format: 
SUBJECT: [subject line]
[Email body - 150 words max, personalized, professional, includes specific pain point about ${input.biggestProblem}]
Make it ready to send. Real company name: ${input.companyName}`,

    leads: `Generate 5 realistic potential leads for ${input.companyName} targeting ${input.targetCustomer} in ${input.industry}.
Return ONLY a JSON array like this:
[{"name":"Full Name","company":"Company Name","role":"Job Title","email":"email@company.com","painPoint":"Specific pain point related to ${input.biggestProblem}"}]
Make names, companies and emails realistic for Indian market.`,

    docs: `Create a professional strategy document for ${input.companyName}.
Command: ${input.command}
Based on board discussion:
CEO: ${(execOutputs.ceo || "").slice(0, 200)}
CMO: ${(execOutputs.cmo || "").slice(0, 200)}
CFO: ${(execOutputs.cfo || "").slice(0, 200)}

Format as a professional document with:
# ${input.companyName} — Strategic Execution Plan
## Executive Summary
## Strategic Priorities (3 points)
## Marketing Plan
## Financial Plan  
## 30-Day Action Plan
## Success Metrics
Keep it concise but complete.`,

    linkedin: `Write a professional LinkedIn post for ${input.companyName} about: ${input.command}
Based on CMO strategy: ${(execOutputs.cmo || "").slice(0, 300)}
Format:
- Hook first line (attention grabbing)
- 3-4 lines of value
- Call to action
- 5 relevant hashtags
- 150 words max
- India startup context
- Emoji usage: moderate`,

    report: `Generate a complete execution report for ${input.companyName}.
Command completed: ${input.command}
Board decision reached. All 8 agents executed.

Format as:
# VISHWAKARMA AI — EXECUTION REPORT
## Mission: ${input.command}
## Board Summary (2 lines each exec)
## Agent Execution Results
## Key Metrics Achieved
## Recommended Next Steps (3 items)
## Generated: ${new Date().toLocaleDateString('en-IN')}`,
  };
  return prompts[agentId] || "";
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function BoardroomOS() {
  const [phase, setPhase] = useState<Phase>(0);
  const [input, setInput] = useState<CompanyInput>({
    companyName: "", industry: "", targetCustomer: "",
    biggestProblem: "", email: "", phone: "", command: "",
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [thinkingId, setThinkingId] = useState<string | null>(null);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [agents, setAgents] = useState<AgentOutput[]>([
    { id: "email",    name: "Email Agent",   icon: "📧", status: "locked", progress: 0, output: "", outputType: "email"    },
    { id: "leads",    name: "Lead Finder",   icon: "🎯", status: "locked", progress: 0, output: "", outputType: "table"    },
    { id: "docs",     name: "Docs Agent",    icon: "📄", status: "locked", progress: 0, output: "", outputType: "doc"      },
    { id: "sheets",   name: "Sheets Agent",  icon: "📊", status: "locked", progress: 0, output: "", outputType: "crm"      },
    { id: "linkedin", name: "LinkedIn Bot",  icon: "💼", status: "locked", progress: 0, output: "", outputType: "linkedin" },
    { id: "calendar", name: "Calendar Bot",  icon: "📅", status: "locked", progress: 0, output: "", outputType: "calendar" },
    { id: "report",   name: "Report Agent",  icon: "📋", status: "locked", progress: 0, output: "", outputType: "report"   },
    { id: "notify",   name: "Notify Agent",  icon: "🔔", status: "locked", progress: 0, output: "", outputType: "notify"   },
  ]);
  const [decision, setDecision] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [voiceLabel, setVoiceLabel] = useState("");
  const [showVoice, setShowVoice] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [execOutputs, setExecOutputs] = useState<Record<string, string>>({});

  const transcriptRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const stopSpeakingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
      synthRef.current?.getVoices();
      synthRef.current?.addEventListener("voiceschanged", () => synthRef.current?.getVoices());
    }
  }, []);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  // ─── SPEAK WITH CHUNKING ──────────────────────────────────────────────────

  const speakText = useCallback((
    text: string,
    exec: { gender: "male" | "female"; rate: number; pitch: number; role: string },
    isFinalDecision = false
  ): Promise<void> => {
    return new Promise((resolve) => {
      const synth = synthRef.current;
      if (!synth) { resolve(); return; }
      synth.cancel();

      const chunks = splitIntoChunks(text, 200);
      let index = 0;

      setVoiceLabel(isFinalDecision ? "⚖️ Board Decision..." : `${exec.role} speaking...`);
      setShowVoice(true);

      function speakChunk() {
        if (stopSpeakingRef.current || index >= chunks.length) {
          resolve();
          return;
        }
        const utter = new SpeechSynthesisUtterance(chunks[index]);
        const voices = synth!.getVoices();

        let voice: SpeechSynthesisVoice | undefined;
        if (isFinalDecision) {
          voice = voices.find(v => v.name.includes("Daniel") || v.name.includes("Moira")) || voices[0];
        } else if (exec.gender === "male") {
          voice = voices.find(v => v.name.includes("David") || v.name.includes("James") || v.name.includes("Daniel"))
            || voices.find(v => !v.name.toLowerCase().includes("female"));
        } else {
          voice = voices.find(v => v.name.includes("Samantha") || v.name.includes("Karen") || v.name.includes("Victoria"))
            || voices.find(v => v.name.toLowerCase().includes("female"));
        }

        if (voice) utter.voice = voice;
        utter.rate = isFinalDecision ? 0.85 : exec.rate;
        utter.pitch = isFinalDecision ? 1.0 : exec.pitch;
        utter.volume = 1.0;

        utter.onend = () => { index++; speakChunk(); };
        utter.onerror = () => { index++; speakChunk(); };

        synth!.speak(utter);
        // Safety timeout per chunk
        setTimeout(() => { if (index < chunks.length) { index++; speakChunk(); } }, 30000);
      }

      speakChunk();
    });
  }, []);

  // ─── CLAUDE API ──────────────────────────────────────────────────────────

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

  // ─── TYPING EFFECT ───────────────────────────────────────────────────────

  const typeMessage = async (msgId: string, fullText: string) => {
    const chunkSize = 8;
    for (let i = chunkSize; i <= fullText.length + chunkSize; i += chunkSize) {
      await sleep(20);
      setMessages(prev => prev.map(m =>
        m.execId === msgId ? { ...m, text: fullText.slice(0, i), isTyping: true } : m
      ));
    }
    setMessages(prev => prev.map(m =>
      m.execId === msgId ? { ...m, text: fullText, isTyping: false } : m
    ));
  };

  // ─── MAIN RUN ────────────────────────────────────────────────────────────

  const runBoardroom = async () => {
    if (isRunning) return;
    const required = ["companyName", "industry", "targetCustomer", "biggestProblem", "command"] as const;
    for (const k of required) {
      if (!input[k].trim()) { alert(`Please fill in: ${k.replace(/([A-Z])/g, " $1")}`); return; }
    }

    setIsRunning(true);
    stopSpeakingRef.current = false;
    setMessages([]);
    setDecision("");
    setDoneIds(new Set());
    setSpeakingId(null);
    setThinkingId(null);
    setExecOutputs({});
    setAgents(prev => prev.map(a => ({ ...a, status: "locked", progress: 0, output: "" })));

    const collectedOutputs: { role: string; text: string }[] = [];
    const outputMap: Record<string, string> = {};

    // ── PHASE 1 ──────────────────────────────────────────────────────────
    setPhase(1);

    for (const exec of EXECUTIVES) {
      // Scroll to card
      cardRefs.current[exec.id]?.scrollIntoView({ behavior: "smooth", block: "center" });

      // THINKING animation
      setThinkingId(exec.id);
      await sleep(1200);

      // Add thinking message
      const thinkMsgId = `think-${exec.id}`;
      setMessages(prev => [...prev, {
        execId: thinkMsgId, role: exec.role, title: exec.title,
        icon: exec.icon, color: exec.color, text: "", timestamp: "", isThinking: true,
      }]);

      await sleep(800);

      // Call Claude
      let text = "";
      try {
        text = await callClaude(buildExecPrompt(exec, input, collectedOutputs));
      } catch {
        text = `As ${exec.role}, I'm analyzing the board's strategy for ${input.command}. Building on previous discussions, I recommend immediate action with measurable targets. Action item: Deploy resources within 48 hours.`;
      }

      collectedOutputs.push({ role: exec.role, text });
      outputMap[exec.id] = text;
      setExecOutputs(prev => ({ ...prev, [exec.id]: text }));

      // Replace thinking with real message
      const now = new Date();
      const ts = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
      setMessages(prev => prev.map(m =>
        m.execId === thinkMsgId
          ? { ...m, execId: exec.id, text: "", timestamp: ts, isThinking: false }
          : m
      ));

      setThinkingId(null);
      setSpeakingId(exec.id);

      // Type and speak simultaneously
      await Promise.all([
        typeMessage(exec.id, text),
        speakText(text, exec),
      ]);

      setSpeakingId(null);
      setDoneIds(prev => new Set([...prev, exec.id]));
      await sleep(400);
    }

    // ── PHASE 2 ──────────────────────────────────────────────────────────
    setPhase(2);
    setThinkingId("decision");

    const decisionPrompt = `You are the AI Boardroom System for ${input.companyName}.
All 7 executives have spoken. Synthesize into ONE unanimous board decision.

Board discussion:
${collectedOutputs.map(o => `${o.role}: ${o.text.slice(0, 200)}`).join("\n\n")}

Write the FINAL BOARD DECISION:
1. The single most important action this week
2. Lead executive responsible
3. Exact success metric (specific number)
4. Deadline (specific date)
5. Budget approved

Start with: "The board unanimously decides:" — Maximum 150 words. Be bold and specific.`;

    let decisionText = "";
    try {
      decisionText = await callClaude(decisionPrompt);
    } catch {
      decisionText = `The board unanimously decides: ${input.companyName} will immediately launch a targeted acquisition campaign for ${input.targetCustomer}, led by VP Sales with CMO support. Success metric: 25 paying customers within 30 days at ₹9,999/month. Budget approved: ₹42L. Deadline: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}. All executives begin execution immediately.`;
    }

    setThinkingId(null);
    setDecision(decisionText);

    // Speak final decision completely
    await speakText(
      "The board has reached a unanimous decision. " + decisionText,
      { gender: "male", rate: 0.85, pitch: 1.0, role: "Board" },
      true
    );
    setShowVoice(false);
    await sleep(600);

    // ── PHASE 3 ──────────────────────────────────────────────────────────
    setPhase(3);
    setAgents(prev => prev.map(a => ({ ...a, status: "locked" })));

    const agentTasks = [
      { id: "email",    prompt: generateAgentPrompt("email",    input, outputMap) },
      { id: "leads",    prompt: generateAgentPrompt("leads",    input, outputMap) },
      { id: "docs",     prompt: generateAgentPrompt("docs",     input, outputMap) },
      { id: "linkedin", prompt: generateAgentPrompt("linkedin", input, outputMap) },
      { id: "report",   prompt: generateAgentPrompt("report",   input, outputMap) },
    ];

    // Calendar slots (no API needed)
    const calendarOutput = `📅 DISCOVERY CALLS SCHEDULED\n\nSlot 1: ${new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')} at 10:00 AM IST\nSlot 2: ${new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')} at 2:00 PM IST\nSlot 3: ${new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')} at 11:00 AM IST\n\nMeeting: ${input.companyName} — Product Demo\nDuration: 30 minutes\nLink: meet.google.com/vishwakarma-demo`;

    const notifyOutput = `🔔 MISSION COMPLETE — ${input.companyName}\n\n✅ 7 AI Executives completed board discussion\n✅ Board decision reached unanimously\n✅ 8 Automation Agents executed\n✅ Emails drafted\n✅ 5 Leads identified\n✅ Strategy document created\n✅ LinkedIn post ready\n✅ Full report generated\n\nCommand: "${input.command}"\nCompleted: ${new Date().toLocaleString('en-IN')}`;

    // Run agents
    for (const agent of agents) {
      setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: "running" } : a));

      // Progress animation
      for (let p = 0; p <= 90; p += 10) {
        await sleep(80);
        setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, progress: p } : a));
      }

      let output = "";

      if (agent.id === "calendar") {
        output = calendarOutput;
      } else if (agent.id === "notify") {
        output = notifyOutput;
      } else if (agent.id === "sheets") {
        // Use leads data
        output = "SHEETS_USE_LEADS";
      } else {
        const task = agentTasks.find(t => t.id === agent.id);
        if (task) {
          try { output = await callClaude(task.prompt); }
          catch { output = `${agent.name} completed for ${input.companyName}.`; }
        }
      }

      // Fire Make.com webhook for paid
      if (agent.id === "notify") {
        try {
          await fetch("https://hook.us2.make.com/osp4dl3tjjjmh75saawjlylw3w6efreg", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_email: input.email,
              user_phone: input.phone,
              company_name: input.companyName,
              industry: input.industry,
              target_customer: input.targetCustomer,
              biggest_problem: input.biggestProblem,
              CEO_strategy: outputMap.ceo?.slice(0, 500) || "",
              CMO_linkedin_post: outputMap.cmo?.slice(0, 500) || "",
              CFO_financial_report: outputMap.cfo?.slice(0, 500) || "",
              COO_operations_plan: outputMap.coo?.slice(0, 500) || "",
              CTO_tech_plan: outputMap.cto?.slice(0, 500) || "",
              VP_sales_email: output,
              VP_sales_strategy: outputMap.vp?.slice(0, 500) || "",
              HR_job_post: outputMap.hr?.slice(0, 500) || "",
            }),
          });
        } catch { /* webhook optional */ }
      }

      setAgents(prev => prev.map(a =>
        a.id === agent.id ? { ...a, status: "done", progress: 100, output } : a
      ));

      await sleep(200);
    }

    // ── PHASE 4 ──────────────────────────────────────────────────────────
    setPhase(4);
    setIsRunning(false);
  };

  // ─── COPY ────────────────────────────────────────────────────────────────

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // ─── RENDER AGENT OUTPUT ─────────────────────────────────────────────────

  const renderAgentOutput = (agent: AgentOutput) => {
    if (!agent.output || agent.status !== "done") return null;

    if (agent.id === "leads" || agent.id === "sheets") {
      let leads: { name: string; company: string; role: string; email: string; painPoint: string }[] = [];
      const leadsAgent = agents.find(a => a.id === "leads");
      try {
        const raw = leadsAgent?.output || agent.output;
        const match = raw.match(/\[[\s\S]*\]/);
        if (match) leads = JSON.parse(match[0]);
      } catch { leads = []; }

      return (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2A2A3A]">
                {agent.id === "leads"
                  ? ["Name", "Company", "Role", "Email", "Pain Point"].map(h => <th key={h} className="text-left py-1.5 pr-3 text-[#9896A8]">{h}</th>)
                  : ["Name", "Company", "Status", "Action"].map(h => <th key={h} className="text-left py-1.5 pr-3 text-[#9896A8]">{h}</th>)
                }
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 5).map((l, i) => (
                <tr key={i} className="border-b border-[#1C1C28]">
                  {agent.id === "leads"
                    ? [l.name, l.company, l.role, l.email, l.painPoint].map((v, j) => <td key={j} className="py-1.5 pr-3 text-[#E8E6F0]">{v}</td>)
                    : [l.name, l.company, "New Lead", "Schedule Demo"].map((v, j) => <td key={j} className="py-1.5 pr-3 text-[#E8E6F0]">{v}</td>)
                  }
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="mt-3">
        <pre className="text-xs text-[#E8E6F0] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-sans">{agent.output}</pre>
        {(agent.id === "email" || agent.id === "linkedin" || agent.id === "docs" || agent.id === "report") && (
          <button
            onClick={() => copyText(agent.output, agent.id)}
            className="mt-2 text-[11px] font-mono border border-[#C9A84C]/30 text-[#C9A84C] px-3 py-1 rounded-full hover:bg-[#C9A84C]/10 transition-all"
          >
            {copied === agent.id ? "✅ Copied!" : "📋 Copy"}
          </button>
        )}
      </div>
    );
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#E8E6F0]" style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#12121A]/95 backdrop-blur border-b border-[#C9A84C]/20 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#F0D080] flex items-center justify-center text-xl flex-shrink-0">🔱</div>
          <div>
            <div className="text-base md:text-lg font-extrabold text-[#F0D080] tracking-tight">Vishwakarma AI</div>
            <div className="text-[9px] md:text-[10px] text-[#9896A8] font-mono tracking-[2px] uppercase">Boardroom Operating System</div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <span className="text-[10px] font-mono border border-[#8A6B25] text-[#C9A84C] bg-[#C9A84C]/10 px-2 md:px-3 py-1 rounded-full">FREE</span>
          <button className="text-[12px] font-bold bg-gradient-to-r from-[#C9A84C] to-[#F0D080] text-[#0A0A0F] px-3 md:px-4 py-2 rounded-full hover:opacity-90 transition-all">
            ₹9,999/mo
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">

        {/* HERO */}
        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-3xl md:text-5xl font-extrabold text-[#F0D080] mb-3 tracking-tight leading-tight">
            Run Your Entire Company<br />
            <span className="text-white">With One Command.</span>
          </h1>
          <p className="text-[#9896A8] text-base md:text-lg">7 AI executives discuss. 8 agents execute. Results delivered. Automatically.</p>
        </div>

        {/* INPUT FORM */}
        <div className="bg-[#12121A] border border-[#C9A84C]/25 rounded-2xl p-5 md:p-7 mb-8">
          <div className="text-[11px] text-[#C9A84C] font-mono tracking-[2px] uppercase mb-5">Company Details + Command</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {[
              { key: "companyName",     label: "Company Name",    placeholder: "e.g. TechMart India" },
              { key: "industry",        label: "Industry",        placeholder: "e.g. B2B SaaS, D2C, EdTech" },
              { key: "targetCustomer",  label: "Target Customer", placeholder: "e.g. Startup founders in India" },
              { key: "biggestProblem",  label: "Biggest Problem", placeholder: "e.g. Low trial-to-paid conversion" },
              { key: "email",           label: "Your Email",      placeholder: "you@company.com" },
              { key: "phone",           label: "Your Phone",      placeholder: "+91 98765 43210" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-[10px] text-[#9896A8] font-mono mb-1.5 uppercase tracking-wider">{label}</label>
                <input
                  type="text" placeholder={placeholder}
                  value={input[key as keyof CompanyInput]}
                  onChange={e => setInput(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full bg-black/40 border border-[#2A2A3A] text-[#E8E6F0] text-sm px-4 py-3 rounded-xl outline-none focus:border-[#8A6B25] transition-colors placeholder-[#6B6A7A]"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-[10px] text-[#9896A8] font-mono mb-1.5 uppercase tracking-wider">Company Command — One Goal</label>
            <textarea rows={3} placeholder="e.g. Get 100 paying customers in 30 days with ₹20L budget"
              value={input.command}
              onChange={e => setInput(p => ({ ...p, command: e.target.value }))}
              className="w-full bg-black/40 border border-[#2A2A3A] text-[#E8E6F0] text-sm px-4 py-3 rounded-xl outline-none focus:border-[#8A6B25] transition-colors placeholder-[#6B6A7A] resize-none"
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {["🚀 Launch product in 30 days", "💰 Get 100 customers in 90 days", "📈 Double revenue in 6 months", "🌍 Expand to 5 cities in Q3"].map(ex => (
              <button key={ex} onClick={() => setInput(p => ({ ...p, command: ex.replace(/^[^\w]*/, "").trim() }))}
                className="text-[11px] font-mono border border-[#C9A84C]/20 bg-[#C9A84C]/10 text-[#F0D080] px-3 py-1.5 rounded-full hover:bg-[#C9A84C]/20 transition-all">
                {ex}
              </button>
            ))}
          </div>
          <button onClick={runBoardroom} disabled={isRunning}
            className="mt-5 w-full bg-gradient-to-r from-[#C9A84C] to-[#F0D080] text-[#0A0A0F] font-extrabold text-base py-4 rounded-xl flex items-center justify-center gap-3 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            <span className="text-xl">🔱</span>
            {isRunning ? "Boardroom in Session..." : "RUN AI BOARDROOM"}
          </button>
        </div>

        {/* PHASE TRACKER */}
        <div className="grid grid-cols-4 gap-0 mb-8 rounded-2xl overflow-hidden border border-[#2A2A3A]">
          {[{ n: 1, label: "Executives" }, { n: 2, label: "Decision" }, { n: 3, label: "Agents" }, { n: 4, label: "Report" }].map(({ n, label }) => (
            <div key={n} className={`py-3 px-2 text-center border-r border-[#2A2A3A] last:border-r-0 transition-all ${
              phase > n ? "bg-emerald-900/30 text-emerald-400" :
              phase === n ? "bg-[#C9A84C]/15 text-[#C9A84C] border-b-2 border-b-[#C9A84C]" :
              "bg-[#12121A] text-[#6B6A7A]"}`}>
              <div className="text-base md:text-xl font-bold mb-0.5">{String(n).padStart(2, "0")}</div>
              <div className="text-[9px] md:text-[10px] font-mono tracking-wider uppercase">{label}</div>
            </div>
          ))}
        </div>

        {/* EXEC CARDS */}
        <div className="mb-2 text-[11px] text-[#C9A84C] font-mono tracking-[2px] uppercase flex items-center gap-2">
          <span>AI Boardroom</span>
          <div className="flex-1 h-px bg-gradient-to-r from-[#C9A84C]/30 to-transparent" />
        </div>
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2 md:gap-3 mb-8">
          {EXECUTIVES.map(exec => {
            const isSpeaking = speakingId === exec.id;
            const isThinking = thinkingId === exec.id;
            const isDone = doneIds.has(exec.id);
            return (
              <div key={exec.id} ref={el => { cardRefs.current[exec.id] = el; }}
                style={{
                  borderColor: isSpeaking ? "#00FFFF" : isThinking ? exec.color : isDone ? "#2DCE7A44" : "#2A2A3A",
                  boxShadow: isSpeaking ? "0 0 24px rgba(0,255,255,0.35)" : isThinking ? `0 0 16px ${exec.color}44` : "none",
                  transition: "all 0.3s",
                }}
                className="relative bg-[#12121A] border rounded-2xl p-3 md:p-4 text-center">
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl opacity-60" style={{ background: exec.color }} />
                <div className="text-xl md:text-2xl mb-1.5">{exec.icon}</div>
                <div className="text-[9px] md:text-[10px] font-mono tracking-wider uppercase mb-0.5" style={{ color: exec.color }}>{exec.role}</div>
                <div className="hidden md:block text-[10px] font-bold text-[#E8E6F0] leading-tight">{exec.title}</div>
                <div className="flex items-center justify-center gap-1 mt-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isSpeaking ? "bg-cyan-400 animate-pulse" : isThinking ? "bg-yellow-400 animate-bounce" : isDone ? "bg-emerald-500/50" : "bg-[#6B6A7A]"}`} />
                  <span className="text-[9px] font-mono" style={{ color: isSpeaking ? "#00FFFF" : isThinking ? "#FFD135" : isDone ? "#2DCE7A" : "#6B6A7A" }}>
                    {isSpeaking ? "Speaking" : isThinking ? "Thinking" : isDone ? "Done ✓" : "Standby"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* TRANSCRIPT */}
        <div className="mb-2 text-[11px] text-[#C9A84C] font-mono tracking-[2px] uppercase flex items-center gap-2">
          <span>Live Transcript</span>
          <div className="flex-1 h-px bg-gradient-to-r from-[#C9A84C]/30 to-transparent" />
        </div>
        <div ref={transcriptRef} className="bg-[#12121A] border border-[#2A2A3A] rounded-2xl p-4 md:p-5 h-72 md:h-80 overflow-y-auto mb-8 scroll-smooth">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#6B6A7A] font-mono text-sm">
              <span className="text-4xl mb-3 opacity-30">🎙️</span>
              Run the boardroom to start live executive discussion
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className="flex gap-3 mb-4" style={{ animation: "fadeSlide 0.4s ease-out" }}>
                <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm" style={{ background: m.color, color: "#0A0A0F" }}>{m.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: m.color }}>{m.role}</span>
                    {m.timestamp && <span className="text-[10px] text-[#6B6A7A] font-mono">{m.title} · {m.timestamp}</span>}
                  </div>
                  {m.isThinking ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#FFD135] font-mono">THINKING</span>
                      {[0,1,2].map(j => <span key={j} className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: `${j*0.15}s` }} />)}
                    </div>
                  ) : (
                    <p className="text-sm text-[#E8E6F0] leading-relaxed">{m.text}{m.isTyping && <span className="inline-block w-0.5 h-4 bg-[#C9A84C] ml-0.5 animate-pulse" />}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* BOARD DECISION */}
        {decision && (
          <div className="bg-gradient-to-br from-[#C9A84C]/10 to-[#C9A84C]/5 border border-[#8A6B25] rounded-2xl p-5 md:p-6 mb-8" style={{ boxShadow: "0 0 32px rgba(201,168,76,0.2)", animation: "fadeSlide 0.5s ease-out" }}>
            <div className="flex items-center gap-2 text-[#F0D080] font-bold text-sm mb-3">🏛️ Final Board Decision — Unanimous</div>
            <p className="text-[#E8E6F0] text-sm leading-relaxed">{decision}</p>
          </div>
        )}

        {/* AGENTS */}
        <div className="mb-2 text-[11px] text-[#C9A84C] font-mono tracking-[2px] uppercase flex items-center gap-2">
          <span>Automation Agents</span>
          <div className="flex-1 h-px bg-gradient-to-r from-[#C9A84C]/30 to-transparent" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {agents.map(agent => (
            <div key={agent.id}
              style={{
                borderColor: agent.status === "running" ? "#4A9EFF" : agent.status === "done" ? "#2DCE7A55" : "#2A2A3A",
                boxShadow: agent.status === "running" ? "0 0 16px rgba(74,158,255,0.2)" : agent.status === "done" ? "0 0 12px rgba(45,206,122,0.15)" : "none",
              }}
              className={`bg-[#12121A] border rounded-2xl p-4 transition-all duration-300 ${agent.status === "locked" ? "opacity-40" : ""} ${agent.status === "done" ? "bg-emerald-900/10" : ""}`}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{agent.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-bold text-[#E8E6F0]">{agent.name}</div>
                  <div className="text-[10px] text-[#6B6A7A] font-mono">
                    {agent.status === "running" ? "Executing..." : agent.status === "done" ? "✅ Complete" : "Waiting..."}
                  </div>
                </div>
                {agent.status === "done" && <span className="text-emerald-400 text-lg">✓</span>}
              </div>
              <div className="h-[2px] bg-[#2A2A3A] rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${agent.status === "done" ? "bg-emerald-400" : "bg-[#4A9EFF]"}`}
                  style={{ width: `${agent.progress}%` }} />
              </div>
              {agent.status === "done" && renderAgentOutput(agent)}
            </div>
          ))}
        </div>

        {/* REPORT */}
        {phase === 4 && (
          <div className="bg-gradient-to-br from-emerald-900/20 to-blue-900/10 border border-emerald-500/30 rounded-2xl p-5 md:p-6 mb-8" style={{ animation: "fadeSlide 0.6s ease-out" }}>
            <div className="text-emerald-400 font-bold text-sm mb-4 flex items-center gap-2">✅ Mission Complete — {input.companyName}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Executives Spoke", value: "7/7", icon: "🎙️" },
                { label: "Board Decision", value: "✓ Unanimous", icon: "🏛️" },
                { label: "Agents Ran", value: "8/8", icon: "🤖" },
                { label: "Outputs Generated", value: "8 items", icon: "📦" },
              ].map(stat => (
                <div key={stat.label} className="bg-black/30 rounded-xl p-3 text-center">
                  <div className="text-2xl mb-1">{stat.icon}</div>
                  <div className="text-sm font-bold text-[#E8E6F0]">{stat.value}</div>
                  <div className="text-[10px] text-[#9896A8]">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* UPSELL */}
        {phase === 4 && (
          <div className="bg-gradient-to-r from-[#C9A84C]/12 to-[#C9A84C]/6 border border-[#C9A84C]/30 rounded-2xl p-5 md:p-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[#F0D080] font-bold text-base mb-1">🔒 Real Automation — Upgrade to Pro</div>
              <div className="text-[#9896A8] text-sm">Actually send emails, post on LinkedIn, update sheets & book meetings automatically</div>
            </div>
            <a href="https://vishwakarmaai.com/company-os" target="_blank" rel="noopener noreferrer"
              className="bg-gradient-to-r from-[#C9A84C] to-[#F0D080] text-[#0A0A0F] font-extrabold text-sm px-5 md:px-6 py-3 rounded-xl hover:opacity-90 transition-all whitespace-nowrap">
              Unlock Full OS →
            </a>
          </div>
        )}

      </div>

      {/* VOICE INDICATOR */}
      {showVoice && (
        <div className="fixed bottom-5 right-5 bg-[#12121A] border border-[#8A6B25] rounded-full px-4 py-2.5 flex items-center gap-3 z-50 shadow-2xl" style={{ animation: "fadeSlide 0.3s ease-out" }}>
          <div className="flex items-end gap-[3px] h-5">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="w-[3px] bg-[#C9A84C] rounded-sm"
                style={{ height: [8,16,24,16,8][i], animation: `wave 0.8s ease-in-out ${i*0.1}s infinite` }} />
            ))}
          </div>
          <span className="text-[12px] text-[#C9A84C] font-mono">{voiceLabel}</span>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeSlide { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes wave { 0%,100%{transform:scaleY(0.5)} 50%{transform:scaleY(1)} }
      `}</style>

    </div>
  );
}
