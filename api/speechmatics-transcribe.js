const SPEECHMATICS_BASE_URL =
  process.env.SPEECHMATICS_API_BASE_URL || "https://asr.api.speechmatics.com/v2";

async function createJob({ audioBase64, mimeType = "audio/webm" }) {
  const apiKey = process.env.SPEECHMATICS_API_KEY;
  if (!apiKey) {
    const error = new Error("SPEECHMATICS_API_KEY is not configured");
    error.status = 500;
    throw error;
  }

  const audioBuffer = Buffer.from(audioBase64, "base64");
  const formData = new FormData();
  const extension = mimeType.includes("wav")
    ? "wav"
    : mimeType.includes("mp4")
      ? "mp4"
      : mimeType.includes("ogg")
        ? "ogg"
        : "webm";

  formData.append(
    "config",
    JSON.stringify({
      type: "transcription",
      transcription_config: {
        language: process.env.SPEECHMATICS_LANGUAGE || "en",
      },
    })
  );

  formData.append(
    "data_file",
    new Blob([audioBuffer], { type: mimeType }),
    `guardian-input.${extension}`
  );

  const res = await fetch(`${SPEECHMATICS_BASE_URL}/jobs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    const error = new Error(`Speechmatics job creation failed: ${text}`);
    error.status = 502;
    throw error;
  }

  return res.json();
}

async function waitForDone(jobId, maxAttempts = 30) {
  const apiKey = process.env.SPEECHMATICS_API_KEY;

  for (let i = 0; i < maxAttempts; i += 1) {
    const res = await fetch(`${SPEECHMATICS_BASE_URL}/jobs/${jobId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Speechmatics status check failed: ${text}`);
    }

    const data = await res.json();
    const status = data.job?.status;

    if (status === "done") return;
    if (status === "rejected" || status === "failed") {
      throw new Error(`Speechmatics job failed with status: ${status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Speechmatics transcription timed out");
}

async function fetchTranscript(jobId) {
  const apiKey = process.env.SPEECHMATICS_API_KEY;
  const url = `${SPEECHMATICS_BASE_URL}/jobs/${jobId}/transcript?format=txt`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Speechmatics transcript fetch failed: ${text}`);
  }

  const transcript = (await res.text()).trim();
  return transcript;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const audioBase64 = String(req.body?.audioBase64 || "").trim();
  const mimeType = String(req.body?.mimeType || "audio/webm").trim();

  if (!audioBase64) {
    return res.status(400).json({ error: "audioBase64 is required" });
  }

  try {
    const created = await createJob({ audioBase64, mimeType });
    const jobId = created.id || created.job?.id;

    if (!jobId) {
      return res.status(502).json({ error: "Speechmatics did not return a job id" });
    }

    await waitForDone(jobId);
    const transcript = await fetchTranscript(jobId);

    return res.status(200).json({ transcript, jobId });
  } catch (error) {
    const rawMessage =
      typeof error === "string"
        ? error
        : error && typeof error.message === "string"
          ? error.message
          : "";

    const message =
      rawMessage && !rawMessage.includes("Unhandled error. (undefined)")
        ? rawMessage
        : "Speechmatics could not process this audio. Please try again with a clearer 4-6 second recording.";

    return res.status(error.status || 500).json({
      error: message,
    });
  }
}
