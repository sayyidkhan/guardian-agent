export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  if (!process.env.VAPI_ASSISTANT_ID) {
    return res.status(200).json({ configured: false });
  }

  return res.status(200).json({
    configured: true,
    assistantId: process.env.VAPI_ASSISTANT_ID,
  });
}
