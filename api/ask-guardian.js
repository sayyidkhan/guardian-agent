import OpenAI from "openai";
import { getValue, setValue } from "./_redis.js";
import { getProfile } from "./profile.js";

const LOG_KEY = "guardian:decisions";

function fallbackDecision(question, profile) {
  const lower = question.toLowerCase();

  if (lower.includes("contract") || lower.includes("2-year") || lower.includes("2 year")) {
    return {
      decision: "ESCALATE",
      action: "escalate",
      confidence: 92,
      reasoning: `This looks high-impact and ${profile.name}'s escalation rules should apply.`,
    };
  }

  const amount = lower.match(/\$\s?(\d+)/)?.[1];
  if (amount && Number(amount) <= 1000) {
    return {
      decision: "APPROVE",
      action: "approve",
      confidence: 81,
      reasoning: "This appears low-risk and within a typical small-approval boundary.",
    };
  }

  return {
    decision: "ESCALATE",
    action: "escalate",
    confidence: 70,
    reasoning: "Insufficient certainty for a safe autonomous decision.",
  };
}

async function askLLM(question, profile) {
  if (!process.env.OPENAI_API_KEY) return null;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `You are a decision proxy.\n\nGuardian profile:\nName: ${profile.name}\nRole: ${profile.role}\nCan decide: ${profile.canDecide}\nMust escalate: ${profile.mustEscalate}\nRules: ${profile.exampleRules || "none"}\n\nQuestion:\n${question}\n\nReturn strict JSON with keys decision (APPROVE|REJECT|ESCALATE), action (approve|reject|escalate), confidence (0-100 number), reasoning (short).`;

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw);

  return {
    decision: parsed.decision || "ESCALATE",
    action: parsed.action || "escalate",
    confidence: Number(parsed.confidence || 50),
    reasoning: parsed.reasoning || "No reasoning returned",
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const question = String(req.body?.question || "").trim();
  if (!question) return res.status(400).json({ error: "Question is required" });

  const profile = await getProfile();
  if (!profile) return res.status(400).json({ error: "Create guardian profile first" });

  let decision;
  try {
    decision = (await askLLM(question, profile)) || fallbackDecision(question, profile);
  } catch {
    decision = fallbackDecision(question, profile);
  }

  const existing = (await getValue(LOG_KEY)) || [];
  const entry = {
    id: Date.now(),
    question,
    ...decision,
    createdAt: new Date().toISOString(),
  };
  await setValue(LOG_KEY, [entry, ...existing].slice(0, 20));

  return res.status(200).json(entry);
}
