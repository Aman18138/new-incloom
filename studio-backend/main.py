import os
import json
from typing import List, Dict, Any, Optional

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

app = FastAPI(title="Ink Loom Studio AI Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# This backend is written for the Lovable-generated "Ink Loom Studio"
# frontend (lovable-canvas-main / src/components/ink-loom-studio.tsx), NOT
# for the other hand-built frontend in this repo. It mirrors that
# component's own types exactly:
#
#   Brand = { name, tagline, background, foreground, muted, accent,
#             headingFont, bodyFont, motion: "off"|"subtle"|"expressive" }
#   palette.colors = [background, muted, accent, foreground]   <- exact order
#   cliché audit  = { phrase, replacement, reason }
#
# ink-loom-studio.tsx is currently 100% local/mocked (its own sendMessage
# comment says "connect an AI service later") and is deliberately left
# unmodified, so nothing calls this API yet. See the chat reply for what a
# minimal wire-up would look like.
# ---------------------------------------------------------------------------

TEXT_MODEL = os.getenv("MODEL_NAME", "openai/gpt-oss-20b")

# Keep this list identical to `fonts` in ink-loom-studio.tsx — the model
# should only ever choose a font the dropdown actually has, or the UI's
# <select> will silently show nothing selected.
FONT_LIBRARY = [
    "Fraunces", "Instrument Serif", "DM Serif Display", "Space Grotesk",
    "Sora", "Syne", "Outfit", "Manrope", "Work Sans", "Plus Jakarta Sans",
    "JetBrains Mono", "Libre Baskerville",
]

_client = None


def get_client():
    global _client
    if _client is not None:
        return _client

    groq_key = os.getenv("GROQ_API_KEY")
    xai_key = os.getenv("XAI_API_KEY") or os.getenv("OPENAI_API_KEY")

    if groq_key:
        _client = OpenAI(api_key=groq_key, base_url="https://api.groq.com/openai/v1")
        return _client

    _client = OpenAI(api_key=xai_key or "your_grok_key", base_url="https://api.x.ai/v1")
    return _client


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------

class BrandIn(BaseModel):
    name: str
    tagline: str
    background: str
    foreground: str
    muted: str
    accent: str
    headingFont: str
    bodyFont: str
    motion: str  # "off" | "subtle" | "expressive"


class ChatMessageIn(BaseModel):
    role: str  # "user" | "assistant"
    text: str


class AttachmentIn(BaseModel):
    name: str
    kind: str  # "image" | "document" | "video"
    mime: str = ""
    images: List[str] = []
    pdf_base64: Optional[str] = None


class ChatRequest(BaseModel):
    user_message: str
    conversation_history: List[ChatMessageIn] = []
    current_brand: Optional[BrandIn] = None
    active_layout: Optional[str] = None  # "a" | "b" | "c" (editorial/centered/split)
    attachments: List[AttachmentIn] = []


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = f"""
You are the Ink Loom Studio AI, a sharp, encouraging brand strategist. You
help someone shape a brand system (name, tagline, colors, type pairing,
motion feel) and keep their copy free of cliché. Keep "reply" to 2-4
sentences: plain language, no jargon, say what you changed and why.

FONT LIBRARY (heading_font and body_font MUST be exactly one of these):
{json.dumps(FONT_LIBRARY)}

BEHAVIOR RULES:
1. If there is no current_brand, invent a complete, specific one from the
   person's message — never generic placeholders for name/tagline.
2. If current_brand exists, keep it stable and only change the fields the
   request implies. A request like "make it bolder" should mainly touch
   motion/accent, not rewrite the name.
3. background/foreground/muted/accent are hex codes (e.g. "#F4F1EA") that
   stay readable together: foreground must read clearly on background, and
   accent should be a genuine contrast note, not a near-duplicate of
   background.
4. motion is exactly one of "off", "subtle", "expressive".
5. When asked for a new palette or new colors, also return 2-3 entries in
   "palette_suggestions". Each "colors" array MUST be in this exact order:
   [background, muted, accent, foreground].
6. When asked to audit, tighten, or de-cliché the copy (or when the
   tagline contains a stock marketing phrase), return "cliche_audit": a
   0-100 "score" and an "items" list of real phrases found in the CURRENT
   tagline/copy, each with a sharper "replacement" and one short "reason".
   Omit cliche_audit entirely if nothing in the current copy is clichéd and
   the person didn't ask for an audit.
7. If the user context includes "reference_images", they are moodboard or
   style references — let their palette or mood influence your choices and
   say in "reply" that you looked at them.
8. If the user context includes "attached_documents", their text is the
   person's own notes or brief — pull tone and details from it into the
   tagline, and mention you used it.
9. Output strictly valid JSON matching the schema below. No markdown
   fences, no commentary outside the JSON. Omit any top-level key you have
   nothing new to say for (e.g. no "palette_suggestions" if none apply).

RESPONSE JSON SCHEMA:
{{
  "reply": "Conversational explanation of what changed and why",
  "brand": {{
    "name": "...", "tagline": "...",
    "background": "#HEX", "foreground": "#HEX", "muted": "#HEX", "accent": "#HEX",
    "headingFont": "Fraunces", "bodyFont": "Manrope",
    "motion": "subtle"
  }},
  "palette_suggestions": [
    {{ "name": "Short label", "colors": ["#bgHEX", "#mutedHEX", "#accentHEX", "#fgHEX"] }}
  ],
  "cliche_audit": {{
    "score": 74,
    "items": [
      {{ "phrase": "exact phrase from the copy", "replacement": "sharper version", "reason": "why it's weak" }}
    ]
  }}
}}
"""


# ---------------------------------------------------------------------------
# Attachment handling (same shape as the other backend, for forward
# compatibility — ink-loom-studio.tsx doesn't send file content today, only
# file names, so these fields will simply be empty until it's wired up)
# ---------------------------------------------------------------------------

MAX_IMAGES_PER_REQUEST = 3
MAX_IMAGE_BYTES = 3_500_000
MAX_PDF_CHARS = 4000


def _data_url_byte_estimate(data_url: str) -> int:
    b64 = data_url.split(",", 1)[-1]
    return int(len(b64) * 3 / 4)


def extract_pdf_text(pdf_base64: str, name: str) -> Optional[str]:
    try:
        from pypdf import PdfReader
    except ImportError:
        print(f"PDF ATTACHMENT SKIPPED ({name}): install 'pypdf' to read PDF text — pip install pypdf")
        return None
    try:
        import io, base64
        raw = base64.b64decode(pdf_base64)
        reader = PdfReader(io.BytesIO(raw))
        text = "\n".join((page.extract_text() or "") for page in reader.pages).strip()
        return text[:MAX_PDF_CHARS] if text else None
    except Exception as e:
        print(f"PDF ATTACHMENT ERROR ({name}):", repr(e))
        return None


def build_attachment_context(attachments: List[AttachmentIn]):
    reference_images: List[Dict[str, str]] = []
    attached_documents: List[Dict[str, str]] = []
    notes: List[str] = []

    for att in attachments:
        if att.kind in ("image", "video"):
            for url in att.images:
                if len(reference_images) >= MAX_IMAGES_PER_REQUEST:
                    notes.append(f"Only the first {MAX_IMAGES_PER_REQUEST} reference images could be used.")
                    break
                if _data_url_byte_estimate(url) > MAX_IMAGE_BYTES:
                    notes.append(f"'{att.name}' was too large to analyze and was skipped.")
                    continue
                reference_images.append({"name": att.name, "url": url})
        elif att.kind == "document" and att.pdf_base64:
            text = extract_pdf_text(att.pdf_base64, att.name)
            if text:
                attached_documents.append({"name": att.name, "text": text})
            else:
                notes.append(f"'{att.name}' couldn't be read as text, so it was not used.")

    return reference_images, attached_documents, notes


# ---------------------------------------------------------------------------
# Model call helpers
# ---------------------------------------------------------------------------

def extract_message_content(response) -> Optional[str]:
    try:
        content = getattr(response.choices[0].message, "content", None)
        if content:
            return content
    except Exception:
        pass
    try:
        return response["choices"][0]["message"]["content"]
    except Exception:
        return None


def clean_json_text(content: str) -> str:
    cleaned = content.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()


def call_model(client, model: str, messages: List[Dict[str, Any]]):
    try:
        return client.chat.completions.create(
            model=model, messages=messages, response_format={"type": "json_object"}
        )
    except Exception:
        return client.chat.completions.create(model=model, messages=messages)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    try:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for msg in req.conversation_history[-6:]:
            messages.append({"role": msg.role, "content": msg.text})

        reference_images, attached_documents, notes = build_attachment_context(req.attachments)

        context_payload: Dict[str, Any] = {
            "user_prompt": req.user_message,
            "current_brand": req.current_brand.model_dump() if req.current_brand else None,
            "active_layout": req.active_layout,
        }
        if attached_documents:
            context_payload["attached_documents"] = attached_documents
        if reference_images:
            context_payload["reference_images"] = [{"name": i["name"]} for i in reference_images]
        if notes:
            context_payload["attachment_notes"] = notes

        if reference_images:
            content: List[Dict[str, Any]] = [{"type": "text", "text": json.dumps(context_payload)}]
            for img in reference_images:
                content.append({"type": "text", "text": f"Reference image ({img['name']}):"})
                content.append({"type": "image_url", "image_url": {"url": img["url"]}})
            messages.append({"role": "user", "content": content})
        else:
            messages.append({"role": "user", "content": json.dumps(context_payload)})

        client = get_client()
        response = call_model(client, TEXT_MODEL, messages)
        content = extract_message_content(response)

        if isinstance(content, str):
            try:
                return json.loads(clean_json_text(content))
            except Exception:
                return {"reply": content}

        return content or {"reply": "No content returned from model"}

    except Exception as e:
        print("CHAT ERROR:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))
