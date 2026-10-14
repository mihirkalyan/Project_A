# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal portfolio site with a blog (software and cybersecurity projects, skills). React + Vite frontend, FastAPI backend. Content is Markdown files in `content/`, so adding a project or post needs no code change. The repo is public: never commit secrets, client names or internal hostnames.

Layout: `backend/` (FastAPI, `app/` + `tests/`), `frontend/` (React + Vite + TS), `content/` (`topics/`, `intros/`), `docs/` (`design-brief.md` is the design spec, `api-contract.md`, `design-reference.md`).

## Commands (backend)

Always use the virtualenv in `backend/.venv`; run from `backend/`.

- Setup: `python -m venv .venv` then `.venv/Scripts/python -m pip install -r requirements-dev.txt`
- Run API: `.venv/Scripts/python -m uvicorn app.main:app --reload`
- All tests: `.venv/Scripts/python -m pytest`
- Single test: `.venv/Scripts/python -m pytest tests/test_health.py::test_health`
- Lint: `.venv/Scripts/python -m ruff check .`
- Dependency audit: `.venv/Scripts/python -m pip_audit`

## Commands (frontend)

Run from `frontend/`. Node 24 lives in `C:\Program Files\nodejs` (in Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"`).

- Install: `npm ci`
- Dev server: `npm run dev` (http://localhost:5173)
- Build: `npm run build` (fails on invalid `content/` files)
- All tests: `npm test`; coverage: `npm run test:coverage`
- Single test file: `npx vitest run src/content/parse.test.ts`
- Lint: `npm run lint`; typecheck: `npm run typecheck`
- Dependency audit: `npm audit`

## X-Force agents

The main session is Professor X and delegates to subagents in `.claude/agents/`. Subagents cannot spawn other subagents, so Cyclops plans and reviews but Professor X does the delegating.

| Agent | Job |
|---|---|
| `cyclops` | Chief: owns `docs/api-contract.md`, plans and reviews cross-cutting work |
| `beast` | Backend (`backend/`) |
| `storm` | Frontend (`frontend/`) |
| `nightcrawler` | Git, GitHub, CI, deploy; pushes only when asked |
| `wolverine` | Security review, read-only |
| `cerebro` | Documentation (`docs/`, README) |
| `colossus` | Tests and QA |
| `pr-review` | Diff review before merge |

Task splitting: `/xforce <task>` (skill in `.claude/skills/xforce/`, also auto-applies to multi-area requests) routes work to the agents, shows the split and waits for the user's OK before dispatching.

API changes go through `docs/api-contract.md` first. Path-gated rules live in `.claude/rules/`. `.claude/skills/karpathy-guidelines/` applies to all coding. `CLAUDE.local.md` and `.claude/settings.local.json` are personal and gitignored.
