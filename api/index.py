"""Nova Chat API: a FastAPI app that runs as a Vercel serverless function and proxies Groq with streaming."""
import collections
import json
import os
import time

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse

try:  # local development only; on Vercel the key comes from Project Settings > Environment Variables
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

GROQ_BASE = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "llama-3.3-70b-versatile")
FALLBACK_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]
NOT_CHAT = ("whisper", "tts", "guard", "playai", "embed", "distil-whisper")

RATE_LIMIT = int(os.getenv("RATE_LIMIT_PER_MIN", "15"))
DAILY_LIMIT = int(os.getenv("DAILY_LIMIT", "2000"))
MAX_TOKENS_CAP = int(os.getenv("MAX_TOKENS_CAP", "2048"))

app = FastAPI(title="Nova Chat")


def api_key() -> str:
    return os.getenv("GROQ_API_KEY", "").strip()


def sse(obj) -> str:
    return f"data: {json.dumps(obj)}\n\n"


def friendly_error(status: int, raw: str) -> str:
    if status == 401:
        return "Invalid Groq API key. Check GROQ_API_KEY in your environment variables."
    if status == 429:
        return "Rate limit reached. Please wait a few seconds and try again."
    try:
        msg = json.loads(raw).get("error", {}).get("message")
    except Exception:
        msg = None
    return msg or f"Groq returned an error ({status})."


# ---------- rate limiting ----------
# Serverless instances are short-lived, so in-memory counters are only a best-effort fallback.
# For reliable limits, add a free Upstash Redis (Vercel Marketplace): the env vars below are picked up automatically.
_hits: dict = collections.defaultdict(list)
_daily = {"day": "", "n": 0}


async def redis_incr(key: str, ttl: int):
    url = os.getenv("UPSTASH_REDIS_REST_URL") or os.getenv("KV_REST_API_URL")
    tok = os.getenv("UPSTASH_REDIS_REST_TOKEN") or os.getenv("KV_REST_API_TOKEN")
    if not (url and tok):
        return None
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.post(url.rstrip("/") + "/pipeline", headers={"Authorization": f"Bearer {tok}"},
                             json=[["INCR", key], ["EXPIRE", key, ttl]])
        return int(r.json()[0]["result"])
    except Exception:
        return None


async def check_limits(request: Request):
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "?")
    today = time.strftime("%Y-%m-%d")
    per_min = await redis_incr(f"nova:ip:{ip}:{int(time.time() // 60)}", 120)
    if per_min is not None:
        per_day = await redis_incr(f"nova:day:{today}", 90000)
    else:  # fallback: memory
        now = time.time()
        recent = [t for t in _hits[ip] if now - t < 60]
        recent.append(now)
        _hits[ip] = recent
        per_min = len(recent)
        if _daily["day"] != today:
            _daily.update(day=today, n=0)
        _daily["n"] += 1
        per_day = _daily["n"]
    if per_min > RATE_LIMIT:
        raise HTTPException(429, "You are sending messages too fast. Please wait a minute and try again.")
    if per_day is not None and per_day > DAILY_LIMIT:
        raise HTTPException(429, "Today's free usage limit has been reached. Please come back tomorrow.")


# ---------- routes ----------
@app.get("/api/config")
def config():
    return {"has_key": bool(api_key()), "default_model": DEFAULT_MODEL}


@app.get("/api/models")
async def models():
    if api_key():
        try:
            async with httpx.AsyncClient(timeout=15) as c:
                r = await c.get(f"{GROQ_BASE}/models", headers={"Authorization": f"Bearer {api_key()}"})
            if r.status_code == 200:
                ids = sorted(m["id"] for m in r.json().get("data", []) if not any(x in m["id"].lower() for x in NOT_CHAT))
                if ids:
                    return {"models": ids, "default": DEFAULT_MODEL if DEFAULT_MODEL in ids else ids[0]}
        except httpx.HTTPError:
            pass
    return {"models": FALLBACK_MODELS, "default": DEFAULT_MODEL}


@app.post("/api/chat")
async def chat(request: Request, body: dict):
    await check_limits(request)
    key = api_key()
    if not key:
        raise HTTPException(400, "GROQ_API_KEY is missing. Add it in your Vercel project's Environment Variables.")
    msgs = [{"role": m["role"], "content": str(m["content"])[:20000]} for m in body.get("messages", [])[-40:]
            if m.get("role") in ("user", "assistant") and m.get("content")]
    if not msgs:
        raise HTTPException(400, "Empty message.")
    system = (body.get("system") or "").strip()[:4000]
    payload = {
        "model": body.get("model") or DEFAULT_MODEL,
        "messages": ([{"role": "system", "content": system}] if system else []) + msgs,
        "stream": True,
        "temperature": min(max(float(body.get("temperature", 0.7)), 0), 2),
        "max_tokens": min(max(int(body.get("max_tokens", 2048)), 64), MAX_TOKENS_CAP),
    }

    async def stream():
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(55, connect=10)) as c:
                async with c.stream("POST", f"{GROQ_BASE}/chat/completions",
                                    headers={"Authorization": f"Bearer {key}"}, json=payload) as r:
                    if r.status_code >= 400:
                        yield sse({"error": friendly_error(r.status_code, (await r.aread()).decode(errors="replace"))})
                        return
                    async for line in r.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        data = line[5:].strip()
                        if data == "[DONE]":
                            break
                        try:
                            delta = json.loads(data)["choices"][0]["delta"].get("content")
                        except Exception:
                            continue
                        if delta:
                            yield sse({"t": delta})
        except httpx.HTTPError as e:
            yield sse({"error": f"Could not reach Groq ({type(e).__name__}). Please try again."})
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"})
