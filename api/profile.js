import { getValue, setValue } from "./_redis.js";

const KEY = "guardian:profile";

export async function getProfile() {
  const profile = await getValue(KEY);
  return profile ?? null;
}

export async function saveProfile(input) {
  const profile = {
    name: String(input.name || "").trim(),
    role: String(input.role || "").trim(),
    canDecide: String(input.canDecide || "").trim(),
    mustEscalate: String(input.mustEscalate || "").trim(),
    exampleRules: String(input.exampleRules || "").trim(),
  };

  if (!profile.name || !profile.role || !profile.canDecide || !profile.mustEscalate) {
    const error = new Error("Missing required profile fields");
    error.status = 400;
    throw error;
  }

  await setValue(KEY, profile);
  return profile;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const profile = await getProfile();
    return res.status(200).json({ profile });
  }

  if (req.method === "POST") {
    try {
      const profile = await saveProfile(req.body || {});
      return res.status(200).json({ profile });
    } catch (error) {
      return res.status(error.status || 500).json({ error: error.message || "Failed to save profile" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
