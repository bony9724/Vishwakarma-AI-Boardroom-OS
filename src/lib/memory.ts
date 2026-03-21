import fs from "fs";
import path from "path";

const MEMORY_FILE = path.join(process.cwd(), "boardroom-memory.json");

interface Memory {
  sessions: Session[];
  userPrefs: Record<string, any>;
  decisions: Decision[];
}

interface Session {
  id: string;
  topic: string;
  timestamp: string;
  summary: string;
  agents: Record<string, any>;
}

interface Decision {
  id: string;
  topic: string;
  decision: string;
  timestamp: string;
  actionItems: string[];
}

function loadMemory(): Memory {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const data = fs.readFileSync(MEMORY_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch {}
  return { sessions: [], userPrefs: {}, decisions: [] };
}

function saveMemory(memory: Memory): void {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
  } catch (e) {
    console.error("Memory save failed:", e);
  }
}

export function saveSession(session: Omit<Session, "id">): string {
  const memory = loadMemory();
  const id = `session_${Date.now()}`;
  memory.sessions.push({ id, ...session });
  if (memory.sessions.length > 50) memory.sessions = memory.sessions.slice(-50);
  saveMemory(memory);
  return id;
}

export function saveDecision(decision: Omit<Decision, "id">): string {
  const memory = loadMemory();
  const id = `decision_${Date.now()}`;
  memory.decisions.push({ id, ...decision });
  saveMemory(memory);
  return id;
}

export function getRecentSessions(limit = 5): Session[] {
  const memory = loadMemory();
  return memory.sessions.slice(-limit).reverse();
}

export function getRecentDecisions(limit = 10): Decision[] {
  const memory = loadMemory();
  return memory.decisions.slice(-limit).reverse();
}

export function getMemoryContext(): string {
  const memory = loadMemory();
  const recent = memory.sessions.slice(-3);
  if (recent.length === 0) return "";
  return `PREVIOUS BOARDROOM CONTEXT:\n${recent.map(s => 
    `- Session on "${s.topic}" (${new Date(s.timestamp).toLocaleDateString()}): ${s.summary}`
  ).join("\n")}`;
}

export function saveUserPref(key: string, value: any): void {
  const memory = loadMemory();
  memory.userPrefs[key] = value;
  saveMemory(memory);
}

export function getUserPref(key: string): any {
  const memory = loadMemory();
  return memory.userPrefs[key];
}