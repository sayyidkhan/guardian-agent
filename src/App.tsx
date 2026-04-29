import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";

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

type PersonStatus = "online" | "away" | "on_leave";

type CatalogPerson = {
  name: string;
  role: string;
  status: PersonStatus;
  avatarUrl: string;
  proxyPrompt: string;
};

type DirectChatMessage = {
  id: number;
  from: "user" | "person";
  text: string;
};

type VapiMessage = {
  type?: string;
  role?: "assistant" | "user" | string;
  transcript?: string;
};

type HealthState = "healthy" | "degraded" | "down" | "unknown";

type HealthService = {
  name: string;
  status: HealthState;
  details: string;
};

type HealthResponse = {
  overall: HealthState;
  checkedAt: string;
  services: {
    openai: HealthService;
    speechmatics: HealthService;
    redis: HealthService;
  };
};

const defaultForm: GuardianProfile = {
  name: "",
  role: "",
  canDecide: "",
  mustEscalate: "",
  exampleRules: "",
};

const peopleCatalog: CatalogPerson[] = [
  {
    name: "Sam Altman",
    role: "AI Product Strategy",
    status: "away",
    avatarUrl: "https://api.dicebear.com/9.x/personas/svg?seed=Sam%20Altman",
    proxyPrompt: "Sam is away. Help me think through this product/AI strategy decision:",
  },
  {
    name: "Dario Amodei",
    role: "Safety & Research Review",
    status: "online",
    avatarUrl: "https://api.dicebear.com/9.x/personas/svg?seed=Dario%20Amodei",
    proxyPrompt: "Dario is away. Provide a safety-focused recommendation for this decision:",
  },
  {
    name: "Elon Musk",
    role: "Speed & Execution Calls",
    status: "on_leave",
    avatarUrl: "https://api.dicebear.com/9.x/personas/svg?seed=Elon%20Musk",
    proxyPrompt: "Elon is on leave. Give me a fast execution-oriented recommendation for:",
  },
  {
    name: "Donald Trump",
    role: "Public Narrative Framing",
    status: "away",
    avatarUrl: "https://api.dicebear.com/9.x/personas/svg?seed=Donald%20Trump",
    proxyPrompt: "Donald is away. Help frame a strong public-facing response for:",
  },
];

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

function ServicePill({
  label,
  status,
}: {
  label: string;
  status: HealthState;
}) {
  const text =
    status === "healthy"
      ? "active"
      : status === "degraded"
        ? "degraded"
        : status === "down"
          ? "down"
          : "unknown";

  return <span className={`health-pill ${status}`}>{label}: {text}</span>;
}

export default function App() {
  const [page, setPage] = useState<"landing" | "setup" | "ask">("landing");
  const [suggestedQuestion, setSuggestedQuestion] = useState("");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const { guardian, setGuardian, loading } = useGuardian();

  const nav = useMemo<NavItem[]>(
    () => [
      { id: "landing", label: "Landing" },
      { id: "setup", label: "Setup" },
      { id: "ask", label: "Ask" },
    ],
    []
  );

  useEffect(() => {
    let mounted = true;

    async function checkHealth() {
      try {
        const res = await fetch("/api/health");
        const data = (await res.json()) as HealthResponse;
        if (mounted && res.ok) setHealth(data);
      } catch {
        if (!mounted) return;
        setHealth({
          overall: "down",
          checkedAt: new Date().toISOString(),
          services: {
            openai: { name: "openai", status: "unknown", details: "Health API unavailable" },
            speechmatics: {
              name: "speechmatics",
              status: "unknown",
              details: "Health API unavailable",
            },
            redis: { name: "redis", status: "unknown", details: "Health API unavailable" },
          },
        });
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="shell">
      <header className="topbar">
        <h1>Guardian Agent</h1>
        <div className="topbar-right">
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
          <div className="health-pills">
            <ServicePill label="OpenAI" status={health?.services.openai.status || "unknown"} />
            <ServicePill
              label="Speechmatics"
              status={health?.services.speechmatics.status || "unknown"}
            />
            <ServicePill label="Redis" status={health?.services.redis.status || "unknown"} />
          </div>
        </div>
      </header>

      <main className="card">
        {page === "landing" && (
          <Landing
            onStart={() => setPage("setup")}
            onConsult={(person) => {
              setSuggestedQuestion(`${person.proxyPrompt} `);
              setPage("ask");
            }}
          />
        )}
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
        {page === "ask" && (
          <Ask
            guardian={guardian}
            loading={loading}
            initialQuestion={suggestedQuestion}
          />
        )}
      </main>
    </div>
  );
}

function Landing({
  onStart,
  onConsult,
}: {
  onStart: () => void;
  onConsult: (person: CatalogPerson) => void;
}) {
  const [activeChatPerson, setActiveChatPerson] = useState<CatalogPerson | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<DirectChatMessage[]>([]);
  const [isVapiCalling, setIsVapiCalling] = useState(false);
  const [vapiStatus, setVapiStatus] = useState("");
  const [vapiAssistantId, setVapiAssistantId] = useState("");
  const [vapiAssistantOverride, setVapiAssistantOverride] = useState("");
  const vapiRef = useRef<Vapi | null>(null);
  const vapiPublicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY;

  function statusLabel(status: PersonStatus) {
    if (status === "online") return "Online";
    if (status === "away") return "Away";
    return "On Leave";
  }

  function openDirectChat(person: CatalogPerson) {
    setActiveChatPerson(person);
    setChatInput("");
    setVapiStatus("");
    setChatMessages([
      {
        id: Date.now(),
        from: "person",
        text: `Hey, I'm ${person.name}. I'm online now — what's the decision you want to discuss?`,
      },
    ]);
  }

  function generateDirectReply(person: CatalogPerson, message: string) {
    if (person.name.includes("Dario")) {
      return `From a safety lens: ${message.toLowerCase().includes("launch") ? "launch with clear safeguards and monitoring." : "define failure modes first, then decide."}`;
    }

    return `Got it. My quick take: ${message.slice(0, 80)}${message.length > 80 ? "..." : ""} — let's align on scope, risk, and next action.`;
  }

  function sendDirectMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeChatPerson) return;

    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const userMessage: DirectChatMessage = {
      id: Date.now(),
      from: "user",
      text: trimmed,
    };

    const personMessage: DirectChatMessage = {
      id: Date.now() + 1,
      from: "person",
      text: generateDirectReply(activeChatPerson, trimmed),
    };

    setChatMessages((prev) => [...prev, userMessage, personMessage]);
    setChatInput("");
  }

  function initVapi() {
    if (vapiRef.current) return vapiRef.current;
    if (!vapiPublicKey) return null;

    const vapi = new Vapi(vapiPublicKey);
    vapi.on("call-start", () => {
      setIsVapiCalling(true);
      setVapiStatus("Live voice call connected.");
    });
    vapi.on("call-end", () => {
      setIsVapiCalling(false);
      setVapiStatus("Call ended.");
    });
    vapi.on("message", (message: VapiMessage) => {
      if (message?.type === "transcript" && message.transcript) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            from: message.role === "assistant" ? "person" : "user",
            text: message.transcript || "",
          },
        ]);
      }
    });

    vapiRef.current = vapi;
    return vapi;
  }

  async function startVapiCall() {
    if (!activeChatPerson) return;
    const activeAssistantId = vapiAssistantOverride.trim() || vapiAssistantId;

    if (!vapiPublicKey || !activeAssistantId) {
      setVapiStatus(
        "Missing Vapi config: VITE_VAPI_PUBLIC_KEY and assistant ID (server VAPI_ASSISTANT_ID or UI override)"
      );
      return;
    }

    try {
      const vapi = initVapi();
      if (!vapi) return;
      await vapi.start(activeAssistantId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start Vapi call";
      setVapiStatus(message);
      setIsVapiCalling(false);
    }
  }

  async function endVapiCall() {
    if (!vapiRef.current) return;
    try {
      await vapiRef.current.stop();
    } catch {
      setVapiStatus("Unable to stop call cleanly.");
    }
  }

  useEffect(() => {
    const savedOverride = localStorage.getItem("guardian:vapi-assistant-override");
    if (savedOverride) setVapiAssistantOverride(savedOverride);

    async function fetchVapiConfig() {
      try {
        const res = await fetch("/api/vapi-config");
        const data = (await res.json()) as { configured?: boolean; assistantId?: string };
        if (res.ok && data.configured && data.assistantId) {
          setVapiAssistantId(data.assistantId);
        }
      } catch {
        setVapiStatus("Unable to load Vapi configuration.");
      }
    }

    void fetchVapiConfig();

    return () => {
      if (vapiRef.current) {
        void vapiRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("guardian:vapi-assistant-override", vapiAssistantOverride);
  }, [vapiAssistantOverride]);

  return (
    <section>
      <div className="hero-block">
        <h2>Your judgement, available even when you are not.</h2>
        <p>AI that keeps companies moving when humans are unavailable.</p>
        <button className="primary" onClick={onStart}>
          Create My Guardian
        </button>
      </div>

      <div className="catalog-header">
        <h3>People Catalog</h3>
        <p>See who is available now. If unavailable, consult their AI proxy.</p>
      </div>

      <div className="people-grid">
        {peopleCatalog.map((person) => {
          const available = person.status === "online";

          return (
            <article className="person-card" key={person.name}>
              <img src={person.avatarUrl} alt={person.name} className="avatar" />
              <div>
                <h4>{person.name}</h4>
                <p className="person-role">{person.role}</p>
              </div>
              <span className={`status-pill ${person.status}`}>{statusLabel(person.status)}</span>
              <button
                className={available ? "secondary" : "primary"}
                onClick={() => {
                  if (available) {
                    openDirectChat(person);
                  } else {
                    onConsult(person);
                  }
                }}
              >
                {available ? "Talk Directly" : "Consult AI Proxy"}
              </button>
            </article>
          );
        })}
      </div>

      {activeChatPerson && (
        <div className="direct-chat-panel">
          <div className="direct-chat-header">
            <h4>Direct Chat: {activeChatPerson.name}</h4>
            <button className="secondary close-btn" onClick={() => setActiveChatPerson(null)}>
              Close
            </button>
          </div>

          <div className="direct-chat-controls">
            <button
              className="primary"
              type="button"
              onClick={isVapiCalling ? endVapiCall : startVapiCall}
            >
              {isVapiCalling ? "End Vapi Voice" : "Start Vapi Voice"}
            </button>
            <label className="assistant-override-field">
              Assistant ID override (optional)
              <input
                value={vapiAssistantOverride}
                onChange={(e) => setVapiAssistantOverride(e.target.value)}
                placeholder={vapiAssistantId || "asst_..."}
              />
            </label>
            {vapiStatus && <p className="vapi-status">{vapiStatus}</p>}
          </div>

          <div className="direct-chat-messages">
            {chatMessages.map((message) => (
              <p key={message.id} className={`direct-bubble ${message.from}`}>
                <strong>{message.from === "user" ? "You" : activeChatPerson.name}:</strong> {message.text}
              </p>
            ))}
          </div>

          <form className="direct-chat-form" onSubmit={sendDirectMessage}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
            />
            <button className="primary" type="submit">
              Send
            </button>
          </form>
        </div>
      )}
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
  initialQuestion,
}: {
  guardian: GuardianProfile | null;
  loading: boolean;
  initialQuestion: string;
}) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<GuardianDecision | null>(null);
  const [pending, setPending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [voiceError, setVoiceError] = useState("");

  useEffect(() => {
    if (initialQuestion && !question.trim()) {
      setQuestion(initialQuestion);
    }
  }, [initialQuestion, question]);

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
