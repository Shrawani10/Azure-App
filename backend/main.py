"""
Kisan Backend — Azure AI Foundry Agents (streaming)
====================================================
Uses azure-ai-agents with DefaultAzureCredential.

One-time setup:
  winget install Microsoft.AzureCLI   (in Windows PowerShell/cmd, then restart)
  az login

Run:
  cd backend && python main.py        (http://localhost:8000)

Set in .env:
  VITE_BACKEND_URL=http://localhost:8000
"""

import asyncio
import json
import logging
import os
from typing import AsyncGenerator

import uvicorn
from azure.ai.agents.aio import AgentsClient
from azure.ai.agents.models import (
    AsyncAgentEventHandler,
    MessageDeltaChunk,
    ThreadMessageOptions,
    ThreadRun,
)
from azure.identity.aio import DefaultAzureCredential
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'), override=False)
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
API_BASE     = os.getenv("VITE_API_BASE_URL", "https://proj-kisan.services.ai.azure.com").rstrip("/")
PROJECT_NAME = os.getenv("AZURE_PROJECT_NAME", "proj-kisan")
AGENT_NAME   = os.getenv("AZURE_AGENT_NAME", "kisan")
ENDPOINT     = f"{API_BASE}/api/projects/{PROJECT_NAME}"

log.info(f"Agents endpoint: {ENDPOINT}")

# Agent ID cache
_agent_id: str | None = None


async def get_agent_id(client: AgentsClient) -> str | None:
    global _agent_id
    if _agent_id:
        return _agent_id
    try:
        async for agent in client.list_agents():
            if agent.name.lower() == AGENT_NAME.lower():
                _agent_id = agent.id
                log.info(f"Found agent '{AGENT_NAME}' → id={_agent_id}")
                return _agent_id
        log.error(f"Agent '{AGENT_NAME}' not found.")
        return None
    except Exception as e:
        log.error(f"Error fetching agents: {e}")
        return None


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="Kisan API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------
class Message(BaseModel):
    role: str
    content: str | list


class ChatRequest(BaseModel):
    messages: list[Message]
    language: str = "hi"


# ---------------------------------------------------------------------------
# Language names
# ---------------------------------------------------------------------------
LANGUAGE_NAMES = {
    "hi": "Hindi",  "en": "English", "mr": "Marathi", "te": "Telugu",
    "ta": "Tamil",  "kn": "Kannada", "gu": "Gujarati","ml": "Malayalam",
    "pa": "Punjabi","bn": "Bengali", "or": "Odia",
}


# ---------------------------------------------------------------------------
# SSE streaming
# ---------------------------------------------------------------------------
async def stream_agent_response(messages: list[Message], language: str) -> AsyncGenerator[str, None]:
    lang = LANGUAGE_NAMES.get(language, "Hindi")

    # Build ThreadMessageOptions list
    thread_msgs: list[ThreadMessageOptions] = []
    for i, msg in enumerate(messages):
        if msg.role not in ("user", "assistant"):
            continue
        content = msg.content
        if i == 0 and msg.role == "user" and isinstance(content, str):
            content = f"[Always respond in {lang}]\n\n{content}"
        if isinstance(content, list):
            content = [p if isinstance(p, dict) else {"type": "text", "text": str(p)} for p in content]
        thread_msgs.append(ThreadMessageOptions(role=msg.role, content=content))

    queue: asyncio.Queue = asyncio.Queue()

    class Handler(AsyncAgentEventHandler):
        async def on_message_delta(self, delta: MessageDeltaChunk):
            text = delta.text
            if text:
                await queue.put(("text", text))

        async def on_thread_run(self, run: ThreadRun):
            if run.status in ("failed", "cancelled", "expired"):
                err = getattr(run, "last_error", None)
                await queue.put(("error", err.message if err else f"Run {run.status}"))

        async def on_done(self):
            await queue.put(("done", None))

        async def on_error(self, data):
            await queue.put(("error", str(data)))

    async def run_agent():
        credential = DefaultAzureCredential()
        try:
            async with AgentsClient(endpoint=ENDPOINT, credential=credential) as client:
                agent_id = await get_agent_id(client)
                if not agent_id:
                    await queue.put(("error", f'Agent "{AGENT_NAME}" not found'))
                    return

                # Create thread with the conversation history
                thread = await client.threads.create(messages=thread_msgs)
                handler = Handler()

                # Stream the run
                async with await client.runs.stream(
                    thread_id=thread.id,
                    agent_id=agent_id,
                    event_handler=handler,
                ):
                    pass  # events flow through the handler into queue
        except Exception as e:
            log.error(f"Agent error: {e}")
            await queue.put(("error", str(e)))

    task = asyncio.create_task(run_agent())
    try:
        while True:
            try:
                kind, data = await asyncio.wait_for(queue.get(), timeout=120.0)
            except asyncio.TimeoutError:
                yield f"data: {json.dumps({'error': 'Timeout waiting for agent response'})}\n\n"
                yield "data: [DONE]\n\n"
                return

            if kind == "text":
                yield f"data: {json.dumps({'choices': [{'delta': {'content': data}, 'index': 0}]})}\n\n"
            elif kind == "error":
                yield f"data: {json.dumps({'error': data})}\n\n"
                yield "data: [DONE]\n\n"
                return
            elif kind == "done":
                yield "data: [DONE]\n\n"
                return
    finally:
        task.cancel()
        try:
            await task
        except (asyncio.CancelledError, Exception):
            pass


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    credential = DefaultAzureCredential()
    try:
        async with AgentsClient(endpoint=ENDPOINT, credential=credential) as client:
            agent_id = await get_agent_id(client)
            return {"status": "ok" if agent_id else "agent_not_found", "agent": AGENT_NAME, "agent_id": agent_id}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@app.post("/chat")
async def chat(req: ChatRequest):
    if not req.messages:
        raise HTTPException(status_code=400, detail="messages cannot be empty")
    return StreamingResponse(
        stream_agent_response(req.messages, req.language),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
