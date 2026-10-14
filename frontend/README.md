# Frontend

React 19 + Vite + TypeScript app for the portfolio home page (phase 1), owned by the `storm` agent. The design spec is `docs/design-brief.md`. Runtime data from the backend goes only through `docs/api-contract.md` (phase 1 uses none).

## Requirements

Node 24 (`engines: >=24`), installed at `C:\Program Files\nodejs`. Dependencies are pinned exactly (`.npmrc` has `save-exact=true`); commit `package-lock.json`.

## Commands

Run from `frontend/`.

- Install: `npm ci`
- Dev server: `npm run dev`
- Build: `npm run build` (`tsc -b && vite build`; also validates `content/` and fails on an invalid file)
- Preview build: `npm run preview`
- Tests: `npm test` (watch: `npm run test:watch`, coverage: `npm run test:coverage`)
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Audit: `npm audit --audit-level=high`

## Content

- Topics and category intros are Markdown files in repo-root `content/` (`topics/*.md`, `intros/*.md`). Schema: `content/README.md` and `docs/design-brief.md` section 7.
- The `portfolio:site-content` plugin in `vite.config.ts` serves the virtual module `virtual:site-content`. It reads `content/` and runs the pure parsers (`src/content/parse.ts`, via `src/content/publish.ts`) in Node, then exports only published, render-ready fields. Markdown bodies, file paths and the `yaml` parser never reach the browser bundle.
- Drafts are excluded on `vite build` (and in any production mode); the dev server and tests keep them. Invalid content throws, so `vite build` fails with the file path. In dev, adding, editing or removing a file under `content/topics` or `content/intros` triggers a full reload.
- `src/content/loader.ts` is the only module that may import `virtual:site-content` or use `import.meta` beyond `import.meta.url` (lint-enforced). Types: `src/content/site-content.d.ts`.

## Config and identity

Name, tagline, hero text, footer links (GitHub, email) and terminal tabs live in `src/config/site.ts`. Links render only when set; GitHub must be `https`. Design tokens live only in `src/styles/tokens.css`.
