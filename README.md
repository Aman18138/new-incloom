# Ink Loom Builder

Local scaffold for the WCC Hackathon: AI-powered brand intelligence and interactive landing page generator.

Backend:
- `backend/main.py` — FastAPI server that proxies prompts to xAI Grok-compatible API.
- Install and run:

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
$env:XAI_API_KEY="your_grok_key_here"
uvicorn main:app --reload --port 8000
```

Frontend:
- `frontend/` — Vite + React + Tailwind app.
- Install and run:

```bash
cd frontend
npm install
npm run dev
```

Notes:
- The backend expects `XAI_API_KEY` (or `OPENAI_API_KEY`) env var for the Grok API.
- The frontend calls `http://localhost:8000/api/chat`. (Merging two layout options happens entirely client-side in `MergePanel.tsx` — there's no `/api/merge` route.)

---

## Ink Loom Studio (Lovable) + studio-backend

`lovable-canvas-main/` is the Lovable-generated version of this same product idea (a TanStack Start app, full shadcn/ui kit, its `src/components/ink-loom-studio.tsx`). It's included here unchanged, exactly as exported from Lovable.

Its AI-sounding features (chat, "New palette", cliché audit) are currently **local-only mocks** — see the comment in its own `sendMessage`: *"connect an AI service later for generated copy and layouts."* No fetch calls exist in that file today.

`studio-backend/` is a FastAPI service built to match that component's exact data shapes (`Brand`, palette `colors` order, cliché-audit `{phrase, replacement, reason}`), using the same Groq-backed approach as `backend/`. It is not yet called by `ink-loom-studio.tsx` — wiring it in means replacing that component's mock functions with real `fetch("http://localhost:8001/api/chat")` calls.

Install and run:

```bash
cd lovable-canvas-main
npm install   # or: bun install
npm run dev   # TanStack Start dev server, http://localhost:3000
```

```powershell
cd studio-backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

(Port 8001, not 8000 — so it can run alongside `backend/` without clashing.)

