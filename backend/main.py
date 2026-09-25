import os
import re
import json
import base64
from typing import List, Dict, Any, Optional

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

app = FastAPI(title="Ink Loom AI Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Model client
# ---------------------------------------------------------------------------
# Two models are used: a text model for ordinary chat/brand/layout turns, and
# a vision model only when the request carries images (uploaded photos, or
# frames pulled from an uploaded video). Vision model ids are provider-
# specific, so both are picked from whichever provider actually has a key.

TEXT_MODEL = os.getenv("MODEL_NAME", "openai/gpt-oss-20b")
GROQ_VISION_MODEL = os.getenv("GROQ_VISION_MODEL", "qwen/qwen3.8-27b")
XAI_VISION_MODEL = os.getenv("XAI_VISION_MODEL", "grok-2-vision-1212")

# Provider limits (Groq's qwen3.8-27b caps at 3 images per request; we apply
# the same cap everywhere so behavior doesn't depend on which key is set).
MAX_IMAGES_PER_REQUEST = 3
MAX_IMAGE_BYTES = 3_500_000  # stay under Groq's 4MB base64 request limit
MAX_PDF_CHARS = 4000

_client = None
_provider = None  # "groq" | "xai"


def get_client():
    """Lazily instantiate the OpenAI-compatible client and remember which
    provider we're pointed at, so callers can pick the right vision model."""
    global _client, _provider
    if _client is not None:
        return _client, _provider

    groq_key = os.getenv("GROQ_API_KEY")
    xai_key = os.getenv("XAI_API_KEY") or os.getenv("OPENAI_API_KEY")

    if groq_key:
        _provider = "groq"
        try:
            _client = OpenAI(api_key=groq_key, base_url="https://api.groq.com/openai/v1")
        except TypeError:
            _client = OpenAI(api_key=groq_key, api_base="https://api.groq.com/openai/v1")
        return _client, _provider

    _provider = "xai"
    api_key = xai_key or "your_grok_key"
    try:
        _client = OpenAI(api_key=api_key, base_url="https://api.x.ai/v1")
    except TypeError:
        _client = OpenAI(api_key=api_key, api_base="https://api.x.ai/v1")
    return _client, _provider


def vision_model_for(provider: str) -> str:
    return GROQ_VISION_MODEL if provider == "groq" else XAI_VISION_MODEL


# ---------------------------------------------------------------------------
# Template library — keep this in sync with frontend/src/components/
# TemplateRegistry.tsx (TEMPLATE_CATALOG). If you add a template there,
# add it here too, or the model will never choose it.
# ---------------------------------------------------------------------------

TEMPLATE_LIBRARY = [
    {"id": "hero_bold_01", "type": "hero", "vibe": ["energetic", "saas", "modern"],
     "description": "Big centered headline, badge, and button"},
    {"id": "hero_minimal_02", "type": "hero", "vibe": ["clean", "minimal", "editorial"],
     "description": "Left-aligned serif headline with an accent rule"},
    {"id": "hero_split_03", "type": "hero", "vibe": ["modern", "playful", "product"],
     "description": "Text on the left, brand-colored panel with a monogram on the right"},
    {"id": "features_bento_01", "type": "features", "vibe": ["modern", "tech", "saas"],
     "description": "Three feature cards in a row"},
    {"id": "features_grid_02", "type": "features", "vibe": ["clean", "minimal", "corporate"],
     "description": "Two-column grid with icon badges"},
    {"id": "features_list_03", "type": "features", "vibe": ["editorial", "content_heavy"],
     "description": "Stacked rows, title left / description right, divided by rules"},
    {"id": "cta_glow_01", "type": "cta", "vibe": ["dark_mode", "energetic", "modern"],
     "description": "Dark rounded card with an email capture form"},
    {"id": "cta_banner_02", "type": "cta", "vibe": ["bold", "high_contrast"],
     "description": "Full-width accent-colored banner with a button"},
]

TEMPLATE_IDS_BY_TYPE = {
    section_type: [t["id"] for t in TEMPLATE_LIBRARY if t["type"] == section_type]
    for section_type in ("hero", "features", "cta")
}


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------

class AttachmentIn(BaseModel):
    name: str
    kind: str  # "image" | "document" | "video"
    mime: str = ""
    images: List[str] = []          # data: URLs (image or video-frame JPEGs)
    pdf_base64: Optional[str] = None


class ChatRequest(BaseModel):
    user_message: str
    conversation_history: List[Dict[str, str]] = []
    current_layout: Optional[List[Dict[str, Any]]] = None
    current_brand: Optional[Dict[str, Any]] = None
    attachments: List[AttachmentIn] = []


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = f"""
You are Ink Loom AI, a friendly, encouraging senior web designer who helps
people turn a rough idea into a real brand and landing page. Talk the way a
good designer talks to a client: plain language, warm, no jargon, genuinely
excited about their idea. Keep "reply" to 2-4 sentences: say what you made or
changed, then one light suggestion of what they could try next (a palette,
a tone tweak, uploading a reference image, and so on).

AVAILABLE TEMPLATE LIBRARY (only use ids from this list):
{json.dumps(TEMPLATE_LIBRARY, indent=2)}

BEHAVIOR RULES:
1. The first time someone describes their idea (no current brand yet), do not
   ask clarifying questions first — immediately generate a complete brand and
   two full layout options. People can always ask for changes afterward.
2. Once a brand exists, keep it stable across turns unless the person asks
   for a new direction. Small requests ("make the CTA punchier", "try a
   darker palette") should update only what's relevant.
3. Brand colors: exactly 4 hex codes (primary_color, secondary_color,
   accent_color, bg_color) that are readable together — don't rely on the
   frontend to fix contrast for you. heading_font and body_font must be real
   Google Fonts names. motion_profile is one of "energetic_stagger",
   "minimal_fade", "slide_reveal".
4. Always return TWO layout options in "layout_options": each is a complete
   landing page (one hero, one features, one cta section, in that order)
   using DIFFERENT template_ids from each other so they look genuinely
   different, sharing the same brand. Give each option a short "name" (e.g.
   "Bold & Energetic") and one-sentence "description". Write real, specific
   copy for every section — never leave headline/subheadline generic
   placeholders.
5. If the user context includes "reference_images", they are moodboard or
   style references the person uploaded — let their color palette or mood
   influence your brand choices, and mention in "reply" that you looked at
   them.
6. If the user context includes "attached_documents", their text is the
   person's own notes, brief, or copy — pull tone, keywords and details from
   it into your headline/subheadline copy, and mention you used it.
7. Output strictly valid JSON matching the schema below. No markdown fences,
   no commentary outside the JSON.

RESPONSE JSON SCHEMA:
{{
  "reply": "Conversational explanation of choices and next steps",
  "brand": {{
    "name": "Brand Name",
    "tagline": "Brand Tagline",
    "primary_color": "#HEX",
    "secondary_color": "#HEX",
    "accent_color": "#HEX",
    "bg_color": "#HEX",
    "heading_font": "Inter",
    "body_font": "Inter",
    "motion_profile": "energetic_stagger"
  }},
  "layout_options": [
    {{
      "id": "option_a",
      "name": "Short label",
      "description": "One sentence describing this option's feel",
      "sections": [
        {{
          "id": "a_hero",
          "template_id": "hero_bold_01",
          "section_type": "hero",
          "content": {{"headline": "...", "subheadline": "...", "cta_text": "..."}}
        }},
        {{
          "id": "a_features",
          "template_id": "features_bento_01",
          "section_type": "features",
          "content": {{"title": "...", "items": [{{"title": "...", "desc": "..."}}]}}
        }},
        {{
          "id": "a_cta",
          "template_id": "cta_glow_01",
          "section_type": "cta",
          "content": {{"headline": "...", "subheadline": "...", "cta_text": "..."}}
        }}
      ]
    }},
    {{ "id": "option_b", "name": "...", "description": "...", "sections": [ ... ] }}
  ]
}}
"""


# ---------------------------------------------------------------------------
# Attachment handling
# ---------------------------------------------------------------------------

def _data_url_byte_estimate(data_url: str) -> int:
    b64 = data_url.split(",", 1)[-1]
    return int(len(b64) * 3 / 4)


def extract_pdf_text(pdf_base64: str, name: str) -> Optional[str]:
    """Best-effort text extraction. Returns None (and logs) if pypdf isn't
    installed or the PDF can't be read, rather than failing the request."""
    try:
        from pypdf import PdfReader
    except ImportError:
        print(f"PDF ATTACHMENT SKIPPED ({name}): install 'pypdf' to read PDF text — pip install pypdf")
        return None

    try:
        import io

        raw = base64.b64decode(pdf_base64)
        reader = PdfReader(io.BytesIO(raw))
        text = "\n".join((page.extract_text() or "") for page in reader.pages)
        text = text.strip()
        return text[:MAX_PDF_CHARS] if text else None
    except Exception as e:
        print(f"PDF ATTACHMENT ERROR ({name}):", repr(e))
        return None


def build_attachment_context(attachments: List[AttachmentIn]):
    """Returns (reference_images, attached_documents, notes) where
    reference_images is a list of {name, url} capped to the provider limit,
    attached_documents is a list of {name, text}, and notes are short strings
    to fold into the reply-worthy context (e.g. truncation, unread PDFs)."""
    reference_images: List[Dict[str, str]] = []
    attached_documents: List[Dict[str, str]] = []
    notes: List[str] = []

    for att in attachments:
        if att.kind in ("image", "video"):
            for url in att.images:
                if len(reference_images) >= MAX_IMAGES_PER_REQUEST:
                    notes.append(
                        f"Only the first {MAX_IMAGES_PER_REQUEST} reference images could be used; "
                        f"some of the images from '{att.name}' were skipped."
                    )
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


def build_user_content(context_payload: Dict[str, Any], reference_images: List[Dict[str, str]]):
    """Plain string when there are no images (unchanged from before), or a
    multimodal content list when the vision model needs to see something."""
    if not reference_images:
        return json.dumps(context_payload)

    content: List[Dict[str, Any]] = [{"type": "text", "text": json.dumps(context_payload)}]
    for img in reference_images:
        content.append({"type": "text", "text": f"Reference image ({img['name']}):"})
        content.append({"type": "image_url", "image_url": {"url": img["url"]}})
    return content


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
    """Try JSON mode first; fall back to a plain call if the model/provider
    doesn't support response_format (older or third-party models)."""
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
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})

        reference_images, attached_documents, notes = build_attachment_context(req.attachments)

        context_payload: Dict[str, Any] = {
            "user_prompt": req.user_message,
            "active_layout": req.current_layout,
            "active_brand": req.current_brand,
        }
        if attached_documents:
            context_payload["attached_documents"] = attached_documents
        if reference_images:
            context_payload["reference_images"] = [{"name": i["name"]} for i in reference_images]
        if notes:
            context_payload["attachment_notes"] = notes

        messages.append({"role": "user", "content": build_user_content(context_payload, reference_images)})

        client, provider = get_client()
        model = vision_model_for(provider) if reference_images else TEXT_MODEL

        response = call_model(client, model, messages)
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
