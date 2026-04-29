import { getValue, setValue } from "./_redis.js";

const SPEECHMATICS_BASE_URL =
  process.env.SPEECHMATICS_API_BASE_URL || "https://asr.api.speechmatics.com/v2";

function serviceResult(name, status, details) {
  return { name, status, details };
}

async function withTimeout(task, ms = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await task(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

async function checkRedis() {
  const hasConfig = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  const probeKey = "guardian:health:probe";

  try {
    const probeValue = `${Date.now()}`;
    await setValue(probeKey, probeValue);
    const fetched = await getValue(probeKey);
    const ok = String(fetched) === probeValue;

    if (!ok) return serviceResult("redis", "down", "Read/write check mismatch");

    if (!hasConfig) {
      return serviceResult("redis", "degraded", "Using local in-memory fallback (Upstash not configured)");
    }

    return serviceResult("redis", "healthy", "Connected and writable");
  } catch (error) {
    return serviceResult("redis", "down", error.message || "Redis probe failed");
  }
}

async function checkOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return serviceResult("openai", "degraded", "OPENAI_API_KEY not configured");

  try {
    const res = await withTimeout((signal) =>
      fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
        signal,
      })
    );

    if (!res.ok) {
      const text = await res.text();
      return serviceResult("openai", "down", `OpenAI check failed: ${text}`);
    }

    return serviceResult("openai", "healthy", "API reachable");
  } catch (error) {
    return serviceResult("openai", "down", error.message || "OpenAI unreachable");
  }
}

async function checkSpeechmatics() {
  const apiKey = process.env.SPEECHMATICS_API_KEY;
  if (!apiKey) {
    return serviceResult("speechmatics", "degraded", "SPEECHMATICS_API_KEY not configured");
  }

  try {
    const res = await withTimeout((signal) =>
      fetch(`${SPEECHMATICS_BASE_URL}/jobs?type=transcription`, {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
        signal,
      })
    );

    if (!res.ok) {
      const text = await res.text();
      return serviceResult("speechmatics", "down", `Speechmatics check failed: ${text}`);
    }

    return serviceResult("speechmatics", "healthy", "API reachable");
  } catch (error) {
    return serviceResult("speechmatics", "down", error.message || "Speechmatics unreachable");
  }
}

async function checkVapi() {
  const apiKey = process.env.VAPI_API_KEY;
  const publicKey = process.env.VITE_VAPI_PUBLIC_KEY;

  if (!apiKey && !publicKey) {
    return serviceResult("vapi", "degraded", "Vapi keys not configured");
  }

  try {
    const res = await withTimeout((signal) =>
      fetch("https://api.vapi.ai/assistant", {
        method: "GET",
        headers: apiKey
          ? { Authorization: `Bearer ${apiKey}` }
          : { Authorization: `Bearer ${publicKey}` },
        signal,
      })
    );

    if (!res.ok) {
      const text = await res.text();
      return serviceResult("vapi", "down", `Vapi check failed: ${text}`);
    }

    return serviceResult("vapi", "healthy", "API reachable");
  } catch (error) {
    return serviceResult("vapi", "down", error.message || "Vapi unreachable");
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const [openai, speechmatics, redis, vapi] = await Promise.all([
    checkOpenAI(),
    checkSpeechmatics(),
    checkRedis(),
    checkVapi(),
  ]);

  const services = { openai, speechmatics, redis, vapi };
  const statuses = Object.values(services).map((item) => item.status);
  const overall = statuses.includes("down")
    ? "down"
    : statuses.includes("degraded")
      ? "degraded"
      : "healthy";

  return res.status(200).json({
    overall,
    checkedAt: new Date().toISOString(),
    services,
  });
}
