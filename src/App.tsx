import { FormEvent, useEffect, useMemo, useState } from "react";

type GuardianProfile = {
  name: string;
  role: string;
  canDecide: string;
  mustEscalate: string;
  exampleRules: string;
};

type GuardianDecision = {
  decision: string;
  confidence: number;
  reasoning: string;
  action: string;
};

type NavItem = {
  id: "landing" | "setup" | "ask";
  label: string;
};

const defaultForm: GuardianProfile = {
  name: "",
  role: "",
  canDecide: "",
  mustEscalate: "",
  exampleRules: "",
};

function useGuardian() {
  const [guardian, setGuardian] = useState<GuardianProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data: { profile?: GuardianProfile | null }) => setGuardian(data.profile ?? null))
      .finally(() => setLoading(false));
  }, []);

  return { guardian, setGuardian, loading };
}

export default function App() {
  const [page, setPage] = useState<"landing" | "setup" | "ask">("landing");
  const { guardian, setGuardian, loading } = useGuardian();

  const nav = useMemo<NavItem[]>(
    () => [
      { id: "landing", label: "Landing" },
      { id: "setup", label: "Setup" },
      { id: "ask", label: "Ask" },
    ],
    []
  );

  return (
    <div className="shell">
      <header className="topbar">
        <h1>Guardian Agent</h1>
        <div className="tabs">
          {nav.map((item: NavItem) => (
            <button
              key={item.id}
              className={page === item.id ? "active" : ""}
              onClick={() => setPage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <main className="card">
        {page === "landing" && <Landing onStart={() => setPage("setup")} />}
        {page === "setup" && (
          <Setup
            initial={guardian}
            loading={loading}
            onSaved={(profile) => {
              setGuardian(profile);
              setPage("ask");
            }}
          />
        )}
        {page === "ask" && <Ask guardian={guardian} loading={loading} />}
      </main>
    </div>
  );
}

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <section>
      <h2>Your judgement, available even when you are not.</h2>
      <p>AI that keeps companies moving when humans are unavailable.</p>
      <button className="primary" onClick={onStart}>
        Create My Guardian
      </button>
    </section>
  );
}

function Setup({
  initial,
  loading,
  onSaved,
}: {
  initial: GuardianProfile | null;
  loading: boolean;
  onSaved: (profile: GuardianProfile) => void;
}) {
  const [form, setForm] = useState<GuardianProfile>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name ?? "",
        role: initial.role ?? "",
        canDecide: initial.canDecide ?? "",
        mustEscalate: initial.mustEscalate ?? "",
        exampleRules: initial.exampleRules ?? "",
      });
    }
  }, [initial]);

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = (await res.json()) as { profile?: GuardianProfile; error?: string };
    setSaving(false);

    if (!res.ok || !data.profile) {
      setMessage(data.error || "Failed to save");
      return;
    }

    setMessage("Saved.");
    onSaved(data.profile);
  }

  if (loading) return <p>Loading profile...</p>;

  return (
    <section>
      <h2>Guardian Setup</h2>
      <form onSubmit={saveProfile} className="form">
        <label>
          Name
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </label>

        <label>
          Role
          <input
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            required
          />
        </label>

        <label>
          What decisions can I make?
          <textarea
            value={form.canDecide}
            onChange={(e) => setForm({ ...form, canDecide: e.target.value })}
            required
          />
        </label>

        <label>
          What must I escalate?
          <textarea
            value={form.mustEscalate}
            onChange={(e) => setForm({ ...form, mustEscalate: e.target.value })}
            required
          />
        </label>

        <label>
          Example rules
          <textarea
            value={form.exampleRules}
            onChange={(e) => setForm({ ...form, exampleRules: e.target.value })}
          />
        </label>

        <button className="primary" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Guardian"}
        </button>
        {message && <p>{message}</p>}
      </form>
    </section>
  );
}

async function blobToBase64(blob: Blob) {
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function Ask({
  guardian,
  loading,
}: {
  guardian: GuardianProfile | null;
  loading: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<GuardianDecision | null>(null);
  const [pending, setPending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [voiceError, setVoiceError] = useState("");

  async function captureAndTranscribe() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setVoiceError("Voice recording is not supported in this browser.");
      return;
    }

    setVoiceError("");
    setVoiceStatus("Recording 4 seconds...");
    setRecording(true);

    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      const stopPromise = new Promise<void>((resolve) => {
        recorder.ondataavailable = (event) => {
          if (event.data?.size) chunks.push(event.data);
        };
        recorder.onstop = () => resolve();
      });

      recorder.start();
      await new Promise((resolve) => setTimeout(resolve, 4000));
      recorder.stop();
      await stopPromise;

      const audioBlob = new Blob(chunks, { type: mimeType });
      const audioBase64 = await blobToBase64(audioBlob);

      setVoiceStatus("Transcribing with Speechmatics...");

      const res = await fetch("/api/speechmatics/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64,
          mimeType,
        }),
      });

      const data = (await res.json()) as { transcript?: string; error?: string };
      if (!res.ok) {
        setVoiceError(data.error || "Speechmatics transcription failed.");
        setVoiceStatus("");
        return;
      }

      if (!data.transcript) {
        setVoiceError("No transcript returned from Speechmatics.");
        setVoiceStatus("");
        return;
      }

      setQuestion((prev: string) => (prev ? `${prev} ${data.transcript}` : data.transcript || ""));
      setVoiceStatus("Transcript added.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to record/transcribe audio.";
      setVoiceError(message);
      setVoiceStatus("");
    } finally {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setRecording(false);
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setResult(null);

    const res = await fetch("/api/ask-guardian", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    const data = (await res.json()) as GuardianDecision;
    setPending(false);
    setResult(data);
  }

  if (loading) return <p>Loading profile...</p>;

  return (
    <section>
      <h2>Ask Guardian</h2>
      {!guardian && <p>Set up your Guardian profile first.</p>}

      <form onSubmit={submit} className="form">
        <label>
          Question
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Can we approve this vendor quote for $800?"
            required
          />
        </label>
        <button
          className="primary"
          type="button"
          onClick={captureAndTranscribe}
          disabled={recording || pending || !guardian}
        >
          {recording ? "Recording..." : "Use Speechmatics Voice"}
        </button>
        <button className="primary" type="submit" disabled={pending || !guardian}>
          {pending ? "Thinking..." : "Ask"}
        </button>
        {voiceStatus && <p>{voiceStatus}</p>}
        {voiceError && <p>{voiceError}</p>}
      </form>

      {result && (
        <div className="result">
          <p>
            <strong>Decision:</strong> {result.decision}
          </p>
          <p>
            <strong>Confidence:</strong> {result.confidence}
          </p>
          <p>
            <strong>Reasoning:</strong> {result.reasoning}
          </p>
          <p>
            <strong>Action:</strong> {result.action}
          </p>
        </div>
      )}
    </section>
  );
}
