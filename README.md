# Excalidraw, out loud

A small demo: you talk, a Voqalize voice agent draws on an Excalidraw canvas.

```
you ──speech──▶ Voqalize (WebRTC, STT, TTS)
                      │ text
                      ▼
                brain/  ── Gemini on Vertex, five tools
                      │ actions
                      ▼
                web/    ── Excalidraw element skeletons
```

Nothing here implements audio, turn-taking or interruption — Voqalize does all of
it. The brain is ~120 lines of Python and the page is one React component.

## What it can do

Five tools, each dispatching an action of the same shape:

| Tool | Say something like |
| --- | --- |
| `draw_shape` | "a big red circle in the middle" |
| `draw_arrow` | "connect them with an arrow" |
| `draw_text` | "write 'sprint 4' at the top" |
| `clear_canvas` | "wipe it and start again" |
| `undo_last` | "actually, undo that" |

## Running it

Two processes. The agent is in **cortex mode**, so the brain dials out to the
relay — no tunnel, no public URL, works from a laptop behind NAT.

```bash
# 1. the brain
cd brain && uv run python run_cortex.py

# 2. the page
cd web && npm run dev     # http://localhost:5173
```

Click **Start talking**, allow the microphone, and say what you want drawn.

Gemini runs through **Vertex AI on `recruitbot-local-202507`** using your gcloud
ADC, so there is no API key to manage. If calls start failing with a credentials
error, refresh it:

```bash
gcloud auth application-default login
```

## Testing without a microphone

`brain/smoke_test.py` drives the brain over the real wire with typed text — no
audio, no browser, real model — and prints the actions each turn dispatched:

```bash
cd brain && uv run python smoke_test.py
```

```
user: Draw a big red circle in the middle of the canvas.
agent: I have drawn a big red circle in the middle of the canvas.
  → draw_shape {"shape": "ellipse", "x": 475, "y": 225, "width": 250, ...}
```

That is the fastest loop for changing the prompt or the tools: turns land in
about two seconds and you see the geometry before you see the drawing.

## Layout

```
brain/
  excalidraw_brain.py   actions, tools, and the system prompt
  run_cortex.py         dials the relay and stays connected
  smoke_test.py         text-mode end-to-end check
  .env                  agent secret + Vertex settings (gitignored)
web/
  src/App.tsx           Excalidraw canvas, mic button, transcript
  src/drawing.ts        action payload → Excalidraw element skeleton
  src/voqalize.ts       the one fetch that starts a session
  .env                  publishable key, origin-locked to localhost:5173
```

## Adding a command

Three edits, all mechanical:

1. An `Action` subclass in `excalidraw_brain.py` — the fields are the payload.
2. An `async def` tool that dispatches it, listed in `tools`. Its docstring is
   the description the model reads, so write it for the model.
3. A `useUICommandHandler("your_action", …)` in `App.tsx`. The command name is
   the class name in snake_case.

## Voqalize resources this demo created

| | |
| --- | --- |
| Tenant | `excali_demo` (`2l2PF__a`) |
| Agent | `excalidraw-demo` — `06ab0be3-7ead-71d6-8000-bcd0fd2db01d`, cortex mode |
| Keys | one `sk_` for the brain, one `pk_` origin-locked to `localhost:5173` |

The agent also has a hosted [playground](https://app.voqalize.com/agents/06ab0be3-7ead-71d6-8000-bcd0fd2db01d/playground?t=06ab0bbd-807f-7aac-8000-fec03f67abfe)
— useful for checking the brain is answering, though it has no canvas, so you
will hear the replies without seeing the drawings.

## Known rough edges

- **Placement is dead reckoning.** The brain never reads the canvas back; it
  remembers roughly where it put things from the conversation. Ask for fifteen
  shapes and some will overlap.
- **Undo is scene snapshots**, so "undo" only rewinds the agent's own drawing —
  it does not know about edits you made by hand.
- Adding a publishable key for another origin means another `create_api_key`
  call; the allowlist is an exact string match on the `Origin` header.
