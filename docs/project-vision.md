# 🛡️ Guardian Agent — Project Vision

## 🧠 One-liner
**We build AI that keeps companies moving when humans are unavailable.**

---

## 📖 Story

You step away from your desk.

But work does not stop.

A teammate needs your input.  
A customer needs an answer.  
An incident needs judgement.  
A decision is waiting on you.

Normally, everything pauses until you return.

**Guardian Agent changes that.**

It acts as your trusted proxy when you are unavailable — answering questions, giving low-stakes approvals, and escalating only when human judgement is truly needed.

---

## 🚨 Problem

Companies still depend on human availability for many small decisions.

When the right person is away:

- teammates wait  
- approvals stall  
- incidents slow down  
- customers get delayed  
- momentum is lost  

The issue is not lack of information.

> The issue is **the decision owner is unavailable.**

---

## 💡 Solution

**Guardian Agent is an AI decision proxy.**

It understands:

- your role  
- your preferences  
- your past decisions  
- your approval boundaries  
- what it can decide  
- what it must escalate  

It responds via chat (and optionally voice) when someone needs your input.

---

## 🎯 Core Promise

> **“Even when you are away, your judgement is not absent.”**

---

## ⚡ MVP Scope (Build Fast Fast Chop Chop)

### 🧩 User Flow

1. User creates their Guardian profile  
2. User defines decision rules  
3. Teammate asks a question  
4. Guardian Agent evaluates  
5. Agent returns:
   - decision (approve / reject / escalate)  
   - reasoning  
   - confidence  

---

## 🎬 Example Demo

### Scenario: You are away

Teammate asks:

> “Can we approve this vendor quote for $800?”

Guardian Agent:

> “Approved. Sayyid’s rule allows vendor approvals below $1,000 within an existing project budget.”

---

Another case:

> “Can we sign a 2-year contract?”

Guardian Agent:

> “I cannot approve this. This is high-impact and should be escalated.”

---

## 🏗️ MVP Tech Stack

### Frontend
- Vite + React  
- Tailwind CSS  
- shadcn/ui (optional)

### Backend
- Vercel Serverless Functions (`/api/*`)

### Database
- Neon Postgres (via Vercel Marketplace)

### AI
- OpenAI / Gemini API

### Voice (Optional)
- Browser SpeechRecognition API  
- Browser SpeechSynthesis API  

### Deployment
- Vercel

---

## 🧱 Architecture

```txt
React (Vite)
   ↓
/api/ask-guardian (Vercel Function)
   ↓
Neon Postgres (rules + profile)
   ↓
LLM API (decision reasoning)
   ↓
Response (decision + explanation)
```

## 🗄️ Database Schema (Simple)

### `guardians`
- `id`
- `name`
- `role`
- `description`

### `rules`
- `id`
- `guardian_id`
- `rule_type` (approve / reject / escalate)
- `condition` (e.g. `amount < 1000`)
- `description`

### `decisions_log`
- `id`
- `guardian_id`
- `question`
- `decision`
- `confidence`
- `reasoning`
- `created_at`

## 🖥️ Pages to Build

### 1. Landing Page

- **Title:** Guardian Agent
- **Subtitle:** AI that keeps companies moving when humans are unavailable
- **CTA:** Create My Guardian

### 2. Guardian Setup Page

**Fields:**
- Name
- Role
- What decisions can I make?
- What must I escalate?
- Example rules

### 3. Ask Guardian Page

**Input:**
- Text (voice optional)

**Output:**
- Decision
- Confidence
- Reason
- Action (approve / reject / escalate)

## 🔥 Core Insight

The magic is not voice.

The magic is:

**Can this agent make the decision safely?**

## ⚙️ Core Logic

### Prompt Structure

```txt
You are a decision proxy.

Guardian profile:
{profile}

Rules:
{rules}

Question:
{question}

Decide:
- APPROVE
- REJECT
- ESCALATE

Return:
- decision
- reasoning
- confidence (0-100)
```

## 🚀 Build Plan (Chop Chop)

### Day 1
- Setup Vite React app
- Setup Vercel project
- Create `/api/ask-guardian`

### Day 2
- Connect Neon Postgres
- Store Guardian profile + rules
- Integrate LLM API

### Day 3
- Build Ask UI
- Show decision + reasoning + confidence
- Polish demo flow

## 🧠 What to Avoid

- Over-engineering agents
- Vector databases
- Complex frameworks
- Anything that slows demo speed

## 🏷️ Taglines

**Primary:**

Your judgement, available even when you are not.

**Alternatives:**

- The AI proxy for decisions that cannot wait
- When humans are away, Guardian keeps work moving

## 💣 Demo Pitch (Short)

> "In companies today, work does not stop because of lack of data.
> It stops because the decision-maker is unavailable.
>
> Guardian Agent solves this.
>
> It acts as your proxy — making low-risk decisions instantly, and escalating only when needed.
>
> So even when you are away… your judgement is not."