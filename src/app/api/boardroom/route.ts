import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export const maxDuration = 300;

const EXECS = [
  {
    name: 'Arjun Mehta', title: 'CEO', key: 'ceo', gender: 'male',
    system: `You are Arjun Mehta, CEO. Bold, visionary, aggressive Indian founder. Plain English only. NO asterisks. NO markdown. NO bullet points. Minimum 250 words. Use rupee amounts as "X lakhs". Use "Day 15" "Week 2" timelines. You speak FIRST. Set the strategic direction with fire and conviction. Give real market data, real numbers, real strategy. End with: "Now I want to hear from Priya on marketing strategy."`,
  },
  {
    name: 'Priya Sharma', title: 'CMO', key: 'cmo', gender: 'female',
    system: `You are Priya Sharma, CMO. Sharp, creative, data-driven. Plain English only. NO asterisks. NO markdown. Minimum 250 words. MUST start with: "Thank you Arjun. I hear you but I disagree on one critical point." Reference Arjun by name. Give specific CAC numbers, conversion rates, channel strategies with rupee amounts. End with: "Vikram, tell me you can find the budget for this."`,
  },
  {
    name: 'Vikram Nair', title: 'CFO', key: 'cfo', gender: 'male',
    system: `You are Vikram Nair, CFO. Conservative, numbers-obsessed. Plain English only. NO asterisks. NO markdown. Minimum 250 words. MUST start with: "Priya, I love the ambition. But these numbers will bankrupt us." Reference Arjun and Priya by name. Give specific burn rates, runway, unit economics. Always "X lakhs". End with: "Ravi, can we execute this with current team?"`,
  },
  {
    name: 'Ravi Krishnan', title: 'COO', key: 'coo', gender: 'male',
    system: `You are Ravi Krishnan, COO. Process-obsessed execution machine. Plain English only. NO asterisks. NO markdown. Minimum 250 words. MUST start with: "I have been listening to Arjun, Priya, and Vikram. Here is what will actually work." Give Day 1, Week 1, Month 1 milestones. End with: "Rahul, is our technology ready?"`,
  },
  {
    name: 'Rahul Gupta', title: 'CTO', key: 'cto', gender: 'male',
    system: `You are Rahul Gupta, CTO. Technically brilliant, slightly arrogant. Plain English only. NO asterisks. NO markdown. Minimum 250 words. MUST start with: "Everyone is making plans without understanding the technical reality." Reference all previous speakers. Mention AWS, Vercel, Supabase, Razorpay costs. End with: "Deepak, can you sell what we have today?"`,
  },
  {
    name: 'Deepak Joshi', title: 'VP Sales', key: 'vpsales', gender: 'male',
    system: `You are Deepak Joshi, VP Sales. Most aggressive person in room. Plain English only. NO asterisks. NO markdown. Minimum 250 words. MUST start with: "Rahul, yes I can sell it. And Vikram, with respect, scared money never made money." Give specific sales numbers: calls per day, demos per week, close rates. Reference Apollo.io, LinkedIn Sales Navigator. End with: "Kavitha, do we have the team?"`,
  },
  {
    name: 'Kavitha Reddy', title: 'HR Head', key: 'hr', gender: 'female',
    system: `You are Kavitha Reddy, HR Head. Wise, empathetic, the human voice. Plain English only. NO asterisks. NO markdown. Minimum 250 words. MUST start with: "I have heard Arjun's vision, Priya's data, Vikram's caution, Ravi's structure, Rahul's tech reality, and Deepak's aggression." Reference ALL six by name. Give hiring plans with salary ranges. End with one powerful unifying statement.`,
  },
];

async function getExecResponse(
  exec: typeof EXECS[0],
  company: string,
  industry: string,
  cmd: string,
  prev: { name: string; title: string; content: string }[]
): Promise<string> {
  const context = prev.length > 0
    ? prev.map(m => `${m.name} (${m.title}): "${m.content.slice(0, 600)}"`).join('\n\n---\n\n')
    : 'You are speaking first.';

  const r = await ai.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1200,
    system: exec.system,
    messages: [{
      role: 'user',
      content: `Company: ${company}
Industry: ${industry || 'General Business'}
Board Command: ${cmd}

${prev.length > 0
        ? `Previous speakers:\n\n${context}\n\nNow speak as ${exec.name}. React emotionally. Reference them by name. Minimum 250 words.`
        : `Speak first as ${exec.name}. Be bold and specific. Minimum 250 words.`
      }`
    }],
  });

  return (r.content[0] as { text: string }).text;
}

export async function POST(req: NextRequest) {
  try {
    const { companyName, industry, command } = await req.json();

    const discussion: {
      role: string; name: string; title: string;
      content: string; timestamp: string; gender: string;
    }[] = [];
    const prev: { name: string; title: string; content: string }[] = [];

    for (const exec of EXECS) {
      const content = await getExecResponse(exec, companyName, industry || 'General', command, prev);
      discussion.push({
        role: exec.key, name: exec.name, title: exec.title,
        content, timestamp: new Date().toLocaleTimeString('en-IN'), gender: exec.gender,
      });
      prev.push({ name: exec.name, title: exec.title, content });
    }

    const decisionRes = await ai.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 800,
      system: `You are the board secretary. Plain English only. No asterisks, no markdown, no bold, no stars. Plain text only. Write exactly 3 powerful sentences of UNANIMOUS BOARD DECISION. Then write exactly 5 numbered action items: 1. [Task] — Owner: [Name] — Deadline: [Week X] — Budget: [X lakhs]`,
      messages: [{
        role: 'user',
        content: `Company: ${companyName}
Command: ${command}
Board debate: ${prev.map(m => `${m.name}: ${m.content.slice(0, 300)}`).join('\n\n')}
Write UNANIMOUS BOARD DECISION then 5 action items.`
      }],
    });

    const fullText = (decisionRes.content[0] as { text: string }).text;
    const lines = fullText.split('\n').filter(l => l.trim());
    const actionItems: string[] = [];
    const decisionLines: string[] = [];
    lines.forEach(l => /^[1-5][\.\)]/.test(l.trim()) ? actionItems.push(l.trim()) : decisionLines.push(l));

    const boardDecision = decisionLines.join('\n').trim();

    // Generate leads and LinkedIn in parallel
    const [leadsRes, linkedinRes] = await Promise.all([
      ai.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Generate 10 realistic Indian business leads for ${companyName} in ${industry}. Return ONLY a JSON array. No markdown. Each item: name, company, role, email, linkedin, reason.`
        }],
      }),
      ai.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `Write a viral LinkedIn post for ${companyName} based on: "${boardDecision.slice(0, 200)}". Hook, 3-4 points, CTA, 5 hashtags. Max 150 words. India startup context.`
        }],
      }),
    ]);

    let leads: object[] = [];
    try {
      const leadsText = (leadsRes.content[0] as { text: string }).text;
      const clean = leadsText.replace(/```json|```/g, '').trim();
      const match = clean.match(/\[[\s\S]*\]/);
      if (match) leads = JSON.parse(match[0]);
    } catch { leads = []; }

    const linkedinPost = (linkedinRes.content[0] as { text: string }).text;

    return NextResponse.json({
      discussion,
      boardDecision,
      actionItems: actionItems.slice(0, 5),
      leads,
      linkedinPost,
    });

  } catch (error) {
    console.error('Boardroom error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}