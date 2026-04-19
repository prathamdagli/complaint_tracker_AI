# ComplainTracker AI

> **Every complaint, triaged, prioritized and resolved — in seconds.**
>
> An AI-native complaint-management platform that classifies customer complaints, scores urgency from sentiment, and recommends resolutions in real time — and **learns from every QA correction** so it keeps getting sharper.

Built for **Problem Statement PS-14** of the **तर्क SHAASTRA · LDCE Lakshya 2.0 Hackathon**.

---

## Table of Contents

- [Why this project](#why-this-project)
- [Highlight features](#highlight-features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Folder layout](#folder-layout)
- [Getting started](#getting-started)
- [Configuring the optional integrations](#configuring-the-optional-integrations)
- [Test accounts](#test-accounts)
- [How the real-time learning loop works](#how-the-real-time-learning-loop-works)
- [Credits](#credits)

---

## Why this project

In the wellness industry, customer complaints pour in through call centres, emails and direct channels. Each one is reviewed and tagged manually, leading to **delays, inconsistent categorisation** and **missed SLAs**. There is no intelligent way to prioritize the urgent ones or suggest what to do next.

ComplainTracker AI fixes that end-to-end:

1. A customer submits a complaint (web portal **or** Telegram bot).
2. Our ML engine instantly classifies it into `Product / Packaging / Trade / Other`, scores sentiment with VADER, assigns a priority (`High / Medium / Low`) and recommends a resolution.
3. CSE resolves. QA corrects any AI misclassifications — and the model **retrains itself live** on those corrections.
4. Everyone stays in the loop: customers receive updates on web *and* Telegram whenever their ticket moves.

---

## Highlight features

| | |
|---|---|
| 🧠 **Real-time learning** | Every QA correction is stored in a correction memory and triggers an inline, weighted retrain of the classifier. Same complaint? Instantly corrected. Paraphrases? Also corrected. |
| 📝 **Multi-channel intake** | Web portal + fully guided Telegram bot. Both auto-classify, store image proof, and auto-create accounts for Telegram users so they can sign into the web dashboard with the same identity. |
| 🤖 **Gemma-powered AI reply drafter** | One-click "draft reply with AI" in the complaint detail page. Gemma reads the full ticket context (complaint + notes + status + priority) and writes a polished customer message in your chosen tone. CSE edits, then sends — the message is delivered to the customer on both web *and* Telegram. |
| 💬 **Floating chatbot** | Gemma-powered assistant on every page. Customers ask about their tickets ("status of my fridge complaint?"); staff ask about system state. Same endpoint powers `/ask` on the Telegram bot. |
| 🚦 **Priority + SLA engine** | High = 24h, Medium = 48h, Low = 72h. Per-ticket countdown. Breach alerts surfaced to CSE, QA and managers. |
| 🔔 **Two-way notifications** | Every web-side status change is mirrored to the customer's Telegram chat automatically. |
| 👥 **Five role-based dashboards** | Customer · CSE · QA · Manager · Admin — each sees exactly the view they need. |
| ↩️ **Customer withdrawal flow** | Customers can take complaints back with a reason (checkboxes + free-text). Staff get notified immediately. |
| 🌓 **Dark / Light mode** | Full-app theme system backed by CSS variables; toggle persisted in `localStorage`. |

---

## Architecture

```
┌───────────────────┐         ┌────────────────────┐         ┌─────────────────────┐
│   React + Vite    │ ←──────→│  Node / Express    │ ←──────→│  FastAPI ML Engine  │
│   (frontend)      │  REST   │    (backend)       │  REST   │  (ml_engine)        │
│   port 5173       │         │   port 5000        │         │   port 8001         │
│                   │         │                    │         │                     │
│  • Landing        │         │  • Prisma ORM      │         │  • TF-IDF + LogReg  │
│  • Dashboards     │         │  • JWT auth        │         │  • VADER sentiment  │
│  • ChatBot        │         │  • Telegram bot    │         │  • Correction store │
│                   │         │  • Gemini client   │         │  • Live retrain     │
└───────────────────┘         └─────────┬──────────┘         └─────────────────────┘
                                        │
                                        ▼
                              ┌─────────────────────┐
                              │  Telegram Bot API   │
                              │  (customer intake)  │
                              └─────────────────────┘
```

**Three processes** are orchestrated by `start.bat` on Windows — ML engine → backend → frontend — and expose ports **8001 / 5000 / 5173** respectively.

---

## Tech stack

- **Frontend**: React 19 · Vite 8 · Tailwind CSS 3 · React Router · Recharts
- **Backend**: Node.js · Express 5 · Prisma 5 · SQLite · bcryptjs · jsonwebtoken · multer · node-telegram-bot-api · @google/generative-ai
- **ML engine**: Python · FastAPI · scikit-learn (TfidfVectorizer + LogisticRegression) · joblib · vaderSentiment · pandas
- **Base training data**: [TS-PS14.csv](TS-PS14.csv) — 50,000 labeled complaints

---

## Folder layout

```
ComplainTrackerAI/
├── backend/                   Node.js + Express API
│   ├── server.js              Every HTTP endpoint (auth, complaints, notes, chat, AI drafter…)
│   ├── bot.js                 Telegram bot (conversational flow, auto-registration, /ask)
│   ├── geminiClient.js        Gemini / Gemma wrapper
│   ├── authMiddleware.js      JWT auth middleware
│   ├── prisma/schema.prisma   Database schema (User, Complaint, Note, Notification)
│   ├── uploads/               Runtime image uploads (gitignored)
│   └── .env.example           Template for required secrets
│
├── ml_engine/                 Python FastAPI classifier
│   ├── main.py                /analyze + /feedback endpoints; correction memory + retrain loop
│   ├── train.py               One-off training script (already produced models/*.pkl)
│   └── models/                Pre-trained TF-IDF + LogReg models (refreshed by feedback)
│
├── frontend/                  React + Vite SPA
│   └── src/
│       ├── pages/             Landing, Login, Dashboard, QADashboard, OperationsDashboard,
│       │                      AllComplaints, SubmitComplaint, ComplaintDetail, Analytics,
│       │                      SLAMonitoring, Notifications, Reports, Settings
│       ├── components/        Layout, ChatBot
│       └── utils/             api.js, auth.js, theme.js
│
├── TS-PS14.csv                50k-row labeled training dataset
├── start.bat                  One-click launcher for all three services (Windows)
└── README.md                  You are here.
```

---

## Getting started

### Prerequisites

- **Node.js** 18+
- **Python** 3.11+
- **Windows** (the launcher is `start.bat`; on macOS / Linux, start each service manually — commands below)

### 1. Clone + install

```bash
git clone https://github.com/jaineel1/Complaint_Tracker_AI.git
cd Complaint_Tracker_AI

# Backend
cd backend
npm install
cd ..

# Frontend
cd frontend
npm install
cd ..

# ML engine (creates its own venv)
cd ml_engine
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # macOS / Linux
pip install fastapi uvicorn scikit-learn joblib pandas vaderSentiment pydantic
deactivate
cd ..
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env          # or `copy .env.example .env` on Windows
```

Open `backend/.env` and fill in values. The minimum viable config for local dev:

```
DATABASE_URL="file:./dev.db"
ML_ENGINE_URL="http://localhost:8001"
FRONTEND_URL="http://localhost:5173"
```

Telegram bot and Gemma AI are **optional** — see the next section to enable them.

### 3. Initialize the database

```bash
cd backend
npx prisma db push          # create dev.db from schema.prisma
node seed.js                # optional: seed a few demo accounts
```

### 4. Launch

**On Windows**:

```bash
start.bat
```

Three terminal windows open — ML engine (port 8001), backend (port 5000), frontend (port 5173) — and a browser window points at the landing page.

**On macOS / Linux**:

```bash
# Terminal 1
cd ml_engine && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2
cd backend && node server.js

# Terminal 3
cd frontend && npx vite --host
```

Then open <http://localhost:5173>.

---

## Configuring the optional integrations

### Telegram bot

Adds a guided complaint intake over Telegram and two-way status updates.

1. Open Telegram, message **@BotFather**.
2. Send `/newbot`, pick a display name, pick a unique username ending in `bot`.
3. Copy the token BotFather sends you.
4. Paste it into `backend/.env`:
   ```
   TELEGRAM_BOT_TOKEN="12345:ABC..."
   ```
5. *(Optional but nice)* Back in BotFather, `/setcommands` and paste:
   ```
   start - Welcome & menu
   submit - Raise a new complaint
   ask - Ask our AI assistant a question
   mycomplaints - List my complaints
   status - /status CMP-1234 — check a ticket
   account - Show my web-portal login
   resetpassword - Generate a new temporary password
   help - Show all commands
   cancel - Cancel the current step
   ```
6. Restart the backend. On boot you should see:
   ```
   ✅ Telegram bot online as @your_bot_username
   ```

Each Telegram user gets an auto-created customer account (username `tg_<chatId>`) and a one-time temporary password delivered in the same chat — they can log into the web dashboard with it.

### Gemini / Gemma AI

Powers the **"Draft reply with AI"** button and the **floating chatbot** on the web, plus the **`/ask`** command on Telegram.

1. Go to <https://aistudio.google.com/apikey>, sign in, click **Create API key**.
2. Paste the key into `backend/.env`:
   ```
   GEMINI_API_KEY="AIza..."
   GEMINI_MODEL="gemma-3-27b-it"
   ```
3. Restart the backend. On boot you should see:
   ```
   ✅ Gemini client ready (model: gemma-3-27b-it)
   ```

Free tier (at time of writing): ~30 req/min, 14.4k req/day — plenty for all user-triggered features.

---

## Test accounts

Seeded by `node backend/seed.js`:

| Role      | Username            | Password     |
|-----------|---------------------|--------------|
| Admin     | admin@gmail.com     | admin123     |
| Manager   | manager@gmail.com   | manager123   |
| QA        | qa@gmail.com        | qa123        |
| CSE       | cse@gmail.com       | cse123       |
| Customer  | customer@gmail.com  | customer123  |

> Change these before any public deployment.

---

## How the real-time learning loop works

The signature feature of this project.

```
┌───────────────────────┐     QA opens ticket, flips     ┌───────────────────────┐
│  Customer submits     │────→ AI "Trade" to "Product" ─→│  Backend fires POST   │
│  "Can I return…?"     │     (web or QA dashboard)      │  /feedback to ML      │
└───────────────────────┘                                 └──────────┬────────────┘
                                                                     ▼
                                  ┌──────────────────────────────────────────┐
                                  │  ML engine:                              │
                                  │  1. Append correction to                 │
                                  │     feedback_store.json                  │
                                  │  2. Rebuild TF-IDF similarity index      │
                                  │  3. Retrain LogReg inline with           │
                                  │     corrections weighted 5× vs base      │
                                  │     dataset (~2s for 50k rows)           │
                                  │  4. Hot-swap .pkl files in memory        │
                                  └──────────────────────────────────────────┘
                                                                     ▼
┌───────────────────────┐     Next /analyze call          ┌───────────────────────┐
│  Same text?           │  ←  Correction memory hit      │  Cosine-sim ≥ 0.75    │
│  → returns "Product"  │     (similarity score 1.0)     │  to a stored correction│
│  instantly from cache │                                 │  → instant override   │
└───────────────────────┘                                 └───────────────────────┘
                                                                     ▼
┌───────────────────────┐     Paraphrase? ("I want to     ┌───────────────────────┐
│  Retrained weights    │  ←  return the fridge I got")  │  No similarity hit?   │
│  also return "Product"│                                 │  Retrained classifier │
│                       │                                 │  generalises anyway   │
└───────────────────────┘                                 └───────────────────────┘
```

Inspect the current correction store at any time via:

```bash
curl http://localhost:8001/feedback
```

---

## Credits

Built for **Problem Statement PS-14 · तर्क SHAASTRA · LDCE Lakshya 2.0 Hackathon** — *Design · Decode · Dominate.*

The AI stack stands on the shoulders of:

- [scikit-learn](https://scikit-learn.org/) — TF-IDF & Logistic Regression
- [VADER Sentiment](https://github.com/cjhutto/vaderSentiment) — rule-based sentiment scoring
- [Gemma](https://ai.google.dev/gemma) via [Google AI Studio](https://aistudio.google.com/) — generative AI assistant
- [Prisma](https://www.prisma.io/) — type-safe database client
- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api) — Telegram bot framework
- [Tailwind CSS](https://tailwindcss.com/) — styling
