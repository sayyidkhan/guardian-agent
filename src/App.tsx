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
  transcriptType?: "partial" | "final";
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
    vapi: HealthService;
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
    avatarUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Sam_altman.jpg",
    proxyPrompt: "Sam is away. Help me think through this product/AI strategy decision:",
  },
  {
    name: "Dario Amodei",
    role: "Safety & Research Review",
    status: "online",
    avatarUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Dario_Amodei_in_2023.jpg",
    proxyPrompt: "Dario is away. Provide a safety-focused recommendation for this decision:",
  },
  {
    name: "Elon Musk",
    role: "Speed & Execution Calls",
    status: "on_leave",
    avatarUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Elon_Musk_2011_Shankbone.JPG",
    proxyPrompt: "Elon is on leave. Give me a fast execution-oriented recommendation for:",
  },
  {
    name: "Donald Trump",
    role: "Public Narrative Framing",
    status: "away",
    avatarUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Donald_Trump_official_portrait.jpg",
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

function MarketingPage({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="mp-shell">
      <header className="mp-header">
        <span className="mp-logo">Guardian Agent</span>
        <button className="primary" onClick={onEnter}>Launch App →</button>
      </header>

      <main>
        {/* Hero */}
        <section className="mp-hero">
          <div className="lp-badge">AI Decision Proxy</div>
          <h1 className="mp-headline">
            Your judgement,<br />available even when<br />you are not.
          </h1>
          <p className="mp-sub">
            Guardian Agent keeps your organisation moving when key decision-makers are
            unavailable — preserving their judgement, rules, and voice through AI.
          </p>
          <div className="lp-actions">
            <button className="primary mp-cta" onClick={onEnter}>Get Started Free</button>
            <button className="secondary" onClick={onEnter}>See the Demo</button>
          </div>
        </section>

        {/* Problem */}
        <section className="mp-section">
          <div className="mp-section-label">The Problem</div>
          <h2 className="mp-section-title">Decisions stall. Teams wait. Deals die.</h2>
          <p className="mp-section-body">
            Every organisation has critical decision-makers. When they travel, sleep, or step out —
            approvals pile up, projects stall, and opportunities slip. Delegating is risky.
            Waiting is costly. There hasn't been a better option — until now.
          </p>
          <div className="mp-pain-grid">
            <div className="mp-pain">
              <span>⏳</span>
              <div>
                <strong>Hours lost waiting</strong>
                <p>Teams block on a single unavailable approver. Work stops.</p>
              </div>
            </div>
            <div className="mp-pain">
              <span>🎲</span>
              <div>
                <strong>Inconsistent delegation</strong>
                <p>Whoever fills in guesses. Decisions contradict past policy.</p>
              </div>
            </div>
            <div className="mp-pain">
              <span>📵</span>
              <div>
                <strong>No fallback system</strong>
                <p>There's no structured way to encode and deploy human judgement.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Solution */}
        <section className="mp-section mp-solution">
          <div className="mp-section-label solution">The Solution</div>
          <h2 className="mp-section-title">A Guardian that thinks like you.</h2>
          <p className="mp-section-body">
            Set up your Guardian once. Define your role, what decisions you can make,
            what to escalate, and your reasoning style. From that point, Guardian steps in
            whenever you're unavailable — responding with your logic, your confidence, your voice.
          </p>
          <div className="mp-feature-grid">
            <div className="mp-feat">
              <span className="lp-icon">🧠</span>
              <h4>Encodes your judgement</h4>
              <p>Your rules, escalation criteria, and decision style — defined once, applied every time.</p>
            </div>
            <div className="mp-feat">
              <span className="lp-icon">⚡</span>
              <h4>Instant APPROVE / REJECT / ESCALATE</h4>
              <p>Every question gets a clear decision with confidence score and reasoning — in seconds.</p>
            </div>
            <div className="mp-feat">
              <span className="lp-icon">🎙️</span>
              <h4>Voice-first with Speechmatics + Vapi</h4>
              <p>Ask by speaking. Live voice calls for online contacts. AI proxy for everyone else.</p>
            </div>
            <div className="mp-feat">
              <span className="lp-icon">👥</span>
              <h4>People Catalog</h4>
              <p>See who's online, away, or on leave. Talk directly or consult their Guardian proxy.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mp-cta-section">
          <h2>Ready to build your Guardian?</h2>
          <p>Takes 2 minutes to configure. Runs 24/7 as your intelligent stand-in.</p>
          <button className="primary mp-cta" onClick={onEnter}>Create My Guardian →</button>
        </section>
      </main>
    </div>
  );
}

function enterApp() {
  window.history.pushState({}, "", "/app");
}

function leaveApp() {
  window.history.pushState({}, "", "/");
}

export default function App() {
  const [appMode, setAppMode] = useState<"marketing" | "app">(
    () => window.location.pathname.startsWith("/app") ? "app" : "marketing"
  );
  const [page, setPage] = useState<"landing" | "setup" | "ask">("landing");
  const [suggestedQuestion, setSuggestedQuestion] = useState("");
  const [consultPersonName, setConsultPersonName] = useState("");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const { guardian, setGuardian, loading } = useGuardian();

  const nav = useMemo<NavItem[]>(
    () => [
      { id: "setup", label: "My Guardian" },
      { id: "ask", label: "Ask Guardian" },
    ],
    []
  );

  useEffect(() => {
    if (appMode !== "app") return;
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
            vapi: { name: "vapi", status: "unknown", details: "Health API unavailable" },
          },
        });
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, [appMode]);

  useEffect(() => {
    function onPopState() {
      setAppMode(window.location.pathname.startsWith("/app") ? "app" : "marketing");
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (appMode === "marketing") {
    return (
      <MarketingPage
        onEnter={() => {
          enterApp();
          setAppMode("app");
        }}
      />
    );
  }

  return (
    <div className="shell">
      <header className="topbar">
        <h1 className="topbar-logo" onClick={() => { leaveApp(); setAppMode("marketing"); setPage("landing"); }}>Guardian Agent</h1>
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
            <ServicePill label="Vapi" status={health?.services.vapi.status || "unknown"} />
          </div>
        </div>
      </header>

      <main className="card">
        {page === "landing" && (
          <Landing
            onStart={() => setPage("setup")}
            onConsult={(person) => {
              setSuggestedQuestion(`${person.proxyPrompt} `);
              setConsultPersonName(person.name);
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
            consultPersonName={consultPersonName}
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
    <section className="landing-page">

      {/* ── Hero ── */}
      <div className="lp-hero">
        <div className="lp-badge">AI Decision Proxy</div>
        <h2 className="lp-headline">Your judgement,<br />available even when you are not.</h2>
        <p className="lp-sub">
          Guardian Agent acts as your intelligent stand-in — making decisions, routing approvals,
          and keeping your team moving while you're away.
        </p>
        <div className="lp-actions">
          <button className="primary" onClick={onStart}>Create My Guardian</button>
          <button className="secondary" onClick={onStart}>See How It Works ↓</button>
        </div>
      </div>

      {/* ── Features ── */}
      <div className="lp-features">
        <div className="lp-feature">
          <span className="lp-icon">🧠</span>
          <h4>Your Rules, Your Voice</h4>
          <p>Define exactly what you can decide, what to escalate, and how you'd reason. Guardian mirrors your judgement.</p>
        </div>
        <div className="lp-feature">
          <span className="lp-icon">⚡</span>
          <h4>Instant Decisions</h4>
          <p>APPROVE, REJECT, or ESCALATE — with reasoning and confidence score — in seconds, not hours.</p>
        </div>
        <div className="lp-feature">
          <span className="lp-icon">🎙️</span>
          <h4>Voice & Text</h4>
          <p>Ask via text or record your question with Speechmatics voice transcription. Talk directly or consult the AI proxy.</p>
        </div>
      </div>

      {/* ── How it works ── */}
      <div className="lp-steps">
        <h3>How it works</h3>
        <div className="lp-steps-grid">
          <div className="lp-step"><span>1</span><p>Set up your Guardian profile — your role, decision rules, and escalation criteria.</p></div>
          <div className="lp-step"><span>2</span><p>Your team asks Guardian when you're unavailable. It responds as you would.</p></div>
          <div className="lp-step"><span>3</span><p>Talk directly to people who are online, or let the AI proxy handle them when away.</p></div>
        </div>
      </div>

      {/* ── People Catalog ── */}
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
              <div className="person-info">
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
  consultPersonName,
}: {
  guardian: GuardianProfile | null;
  loading: boolean;
  initialQuestion: string;
  consultPersonName: string;
}) {
  const DEFAULT_VAPI_ASSISTANT_ID = "50a4bd83-401e-4189-b856-e4474a72872c";

  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<GuardianDecision | null>(null);
  const [pending, setPending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [isVapiCalling, setIsVapiCalling] = useState(false);
  const [vapiStatus, setVapiStatus] = useState("");
  const [vapiAssistantId, setVapiAssistantId] = useState("");
  const [consultMode, setConsultMode] = useState<"chat" | "voice">("chat");
  const [vapiAssistantOverride] = useState(
    () => localStorage.getItem("guardian:vapi-assistant-override") || ""
  );
  const vapiRef = useRef<Vapi | null>(null);
  const vapiPublicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY;
  const voices = [
    { name: "Vale", tone: "Bright and inquisitive" },
    { name: "Atlas", tone: "Calm and executive" },
    { name: "Nova", tone: "Warm and confident" },
    { name: "Sage", tone: "Measured and analytical" },
  ];
  const [voiceIndex, setVoiceIndex] = useState(0);

  const personVoiceMap: Record<string, number> = {
    "Sam Altman": 0,
    "Elon Musk": 1,
    "Donald Trump": 2,
    "Dario Amodei": 3,
  };

  useEffect(() => {
    if (initialQuestion && !question.trim()) {
      setQuestion(initialQuestion);
    }
  }, [initialQuestion, question]);

  useEffect(() => {
    if (!consultPersonName) return;
    const mapped = personVoiceMap[consultPersonName];
    if (typeof mapped === "number") {
      setVoiceIndex(mapped);
    }
  }, [consultPersonName]);

  useEffect(() => {
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

  function initVapi() {
    if (vapiRef.current) return vapiRef.current;
    if (!vapiPublicKey) return null;

    const vapi = new Vapi(vapiPublicKey);

    vapi.on("call-start", () => {
      setIsVapiCalling(true);
      setVapiStatus("Voice call connected — speak now.");
    });

    vapi.on("call-end", () => {
      setIsVapiCalling(false);
      setVapiStatus("Voice call ended.");
    });

    vapi.on("message", (msg: VapiMessage) => {
      if (
        msg.type === "transcript" &&
        msg.role === "user" &&
        msg.transcriptType === "final" &&
        typeof msg.transcript === "string" &&
        msg.transcript.trim()
      ) {
        setQuestion((prev) =>
          prev ? `${prev} ${msg.transcript}` : msg.transcript ?? ""
        );
      }
    });

    vapi.on("error", (err: unknown) => {
      console.error("[Vapi error]", err);
      let message = "Vapi error";
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === "string") {
        message = err;
      } else if (err && typeof err === "object") {
        const e = err as Record<string, unknown>;
        message =
          typeof e.message === "string" ? e.message :
          typeof e.error === "string" ? e.error :
          typeof e.errorMsg === "string" ? e.errorMsg :
          JSON.stringify(e);
      }
      setVapiStatus(`Error: ${message}`);
      setIsVapiCalling(false);
    });

    vapiRef.current = vapi;
    return vapi;
  }

  async function startVapiCall() {
    const activeAssistantId =
      vapiAssistantOverride.trim() || vapiAssistantId || DEFAULT_VAPI_ASSISTANT_ID;
    if (!vapiPublicKey) {
      setVapiStatus("Missing Vapi config: VITE_VAPI_PUBLIC_KEY");
      return false;
    }

    try {
      const vapi = initVapi();
      if (!vapi) return false;
      await vapi.start(activeAssistantId);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start Vapi call";
      setVapiStatus(message);
      setIsVapiCalling(false);
      return false;
    }
  }

  async function endVapiCall() {
    if (!vapiRef.current) return;
    try {
      await vapiRef.current.stop();
    } catch {
      setVapiStatus("Unable to stop Vapi call cleanly.");
    }
  }

  async function startVoiceFlow() {
    setVoiceError("");
    setVoiceStatus("Starting voice...");
    await startVapiCall();
  }

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

      if (audioBlob.size < 1000) {
        setVoiceError("Recording too short or silent. Please speak clearly and try again.");
        setVoiceStatus("");
        return;
      }

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
        const rawErr = data.error || "";
        const friendlyErr =
          !rawErr || rawErr.toLowerCase().includes("unhandled") || rawErr.includes("undefined")
            ? "Speechmatics could not process this audio. Speak clearly for 4+ seconds and try again."
            : rawErr;
        setVoiceError(friendlyErr);
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
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Unable to record audio. Check microphone permissions and try again.";
      setVoiceError(message);
      setVoiceStatus("");
    } finally {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setRecording(false);
    }
  }

  async function askGuardian() {
    if (!question.trim()) return;

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

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await askGuardian();
  }

  if (loading) return <p>Loading profile...</p>;

  return (
    <section>
      <h2>Ask Guardian</h2>
      {!guardian && <p>Set up your Guardian profile first.</p>}

      <div className="consult-mode-switch" role="tablist" aria-label="Consult mode">
        <button
          type="button"
          className={consultMode === "chat" ? "active" : ""}
          onClick={() => setConsultMode("chat")}
        >
          Ask (Chat)
        </button>
        <button
          type="button"
          className={consultMode === "voice" ? "active" : ""}
          onClick={() => setConsultMode("voice")}
        >
          Voice
        </button>
      </div>

      {consultMode === "voice" ? (
        <div className="voice-screen">
          <p className="voice-screen-title">Choose a voice</p>
          {consultPersonName && (
            <p className="voice-mapped-hint">Mapped for {consultPersonName}</p>
          )}
          <div className="voice-orb" aria-hidden="true" />
          <h3>{voices[voiceIndex].name}</h3>
          <p>{voices[voiceIndex].tone}</p>

          <div className="voice-dots">
            {voices.map((voice, idx) => (
              <button
                key={voice.name}
                type="button"
                className={idx === voiceIndex ? "active" : ""}
                onClick={() => setVoiceIndex(idx)}
                aria-label={`Use ${voice.name} voice`}
              />
            ))}
          </div>

          <div className="voice-actions">
            <button
              className="primary"
              type="button"
              onClick={() => {
                if (isVapiCalling) {
                  void endVapiCall();
                  return;
                }
                void startVoiceFlow();
              }}
              disabled={pending || !guardian}
            >
              {isVapiCalling ? "End Voice" : "Start Voice"}
            </button>
            <button
              className="secondary"
              type="button"
              onClick={() => void askGuardian()}
              disabled={pending || !guardian || !question.trim()}
            >
              {pending ? "Thinking..." : "Ask with Transcript"}
            </button>
            <button className="secondary" type="button" onClick={() => setConsultMode("chat")}>
              Open Chat Instead
            </button>
          </div>

          {question && <p className="voice-preview">Transcript: {question}</p>}
          {vapiStatus && <p>{vapiStatus}</p>}
          {voiceStatus && <p>{voiceStatus}</p>}
          {voiceError && <p>{voiceError}</p>}
        </div>
      ) : (
        <form onSubmit={submit} className="form">
          <label>
            Question
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  void askGuardian();
                }
              }}
              placeholder="Can we approve this vendor quote for $800?"
              required
            />
          </label>
          <p className="voice-preview">Press Cmd/Ctrl + Enter to ask.</p>
          {voiceStatus && <p>{voiceStatus}</p>}
          {voiceError && <p>{voiceError}</p>}
        </form>
      )}

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
