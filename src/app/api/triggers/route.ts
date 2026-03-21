import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const TRIGGERS_FILE = path.join(process.cwd(), "boardroom-triggers.json");

interface Trigger {
  id: string;
  name: string;
  schedule: string;
  task: string;
  agent: string;
  active: boolean;
  lastRun: string | null;
  nextRun: string;
  createdAt: string;
}

function loadTriggers(): Trigger[] {
  try {
    if (fs.existsSync(TRIGGERS_FILE)) {
      return JSON.parse(fs.readFileSync(TRIGGERS_FILE, "utf-8"));
    }
  } catch {}
  return [];
}

function saveTriggers(triggers: Trigger[]): void {
  fs.writeFileSync(TRIGGERS_FILE, JSON.stringify(triggers, null, 2));
}

function getNextRun(schedule: string): string {
  const now = new Date();
  if (schedule === "daily") {
    now.setDate(now.getDate() + 1);
    now.setHours(9, 0, 0, 0);
  } else if (schedule === "weekly") {
    now.setDate(now.getDate() + 7);
    now.setHours(9, 0, 0, 0);
  } else if (schedule === "monthly") {
    now.setMonth(now.getMonth() + 1);
    now.setDate(1);
    now.setHours(9, 0, 0, 0);
  }
  return now.toISOString();
}

export async function GET() {
  try {
    const triggers = loadTriggers();
    return NextResponse.json({ status: "ok", triggers });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, trigger } = body;

    const triggers = loadTriggers();

    if (action === "create") {
      const newTrigger: Trigger = {
        id: `trigger_${Date.now()}`,
        name: trigger.name,
        schedule: trigger.schedule,
        task: trigger.task,
        agent: trigger.agent,
        active: true,
        lastRun: null,
        nextRun: getNextRun(trigger.schedule),
        createdAt: new Date().toISOString(),
      };
      triggers.push(newTrigger);
      saveTriggers(triggers);
      return NextResponse.json({ status: "ok", message: "Trigger created", trigger: newTrigger });
    }

    if (action === "toggle") {
      const t = triggers.find(t => t.id === trigger.id);
      if (t) {
        t.active = !t.active;
        saveTriggers(triggers);
      }
      return NextResponse.json({ status: "ok", message: "Trigger updated" });
    }

    if (action === "delete") {
      const filtered = triggers.filter(t => t.id !== trigger.id);
      saveTriggers(filtered);
      return NextResponse.json({ status: "ok", message: "Trigger deleted" });
    }

    return NextResponse.json({ status: "error", message: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}