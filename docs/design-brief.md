# Design brief

The approved design spec for the portfolio site. If code and this file disagree, raise it with `cyclops` before changing either. Inspiration notes are in `docs/design-reference.md`.

## 1. Vision

- A personal software and cybersecurity portfolio. Audience: recruiters and hiring managers in security engineering.
- Slim Apple-style nav with a full-width mega-menu.
- Retro pixel-art identity that feels playful. The page is dark and sits inside a bordered "window" frame.
- Microcopy is playful and lowercase ("nothing here yet", "copied").
- Visual cue taken (not copied) from hermes-agent.nousresearch.com: bold full-bleed colour, square corners, a tabbed terminal panel and numbered cards.
- **No-copy rule:** never copy their text, images or logo, or their licensed fonts (Aeonik Fono, Rules).

## 2. Stack options

| Option | Summary | Pros | Cons |
|---|---|---|---|
| **A (chosen)** | Vite + React + TS. Content is read at build time from repo-root `content/` by a Vite plugin (section 5). Static output. FastAPI is kept for later dynamic features. | Matches the existing rules and agents. The user knows React. Tiny runtime. | Prerendering per-topic HTML needs an extra step. Phase 2 will use either `vite --ssr` plus a `renderToString` script, or `vite-react-ssg` with `react-router`. |
| B | Astro + React islands | Best static-first output. Content collections are built in. | New framework. The rules, agents and `CLAUDE.md` would need updating. |
| C (rejected) | SPA that fetches content from FastAPI | - | Not static-first. |

## 3. Design tokens (palette "Electric")

All values live **only** in `frontend/src/styles/tokens.css`. Do not hardcode them anywhere else.

As built, the only literal values outside `tokens.css` are:
- `public/favicon.svg` (static file, cannot read CSS variables).
- The media-query breakpoints, because media queries cannot read custom properties: `48rem` (and its `max-width` twin `47.99rem`) in component CSS, and `64rem` in `Hero.module.css`. `tokens.css` records `--bp-mobile: 48rem` and `--bp-wide: 64rem` for documentation only.
- The `1px` size of the `.visually-hidden` utility in `global.css`.

### Colour

| Token | Value | Use / contrast on `--color-bg` |
|---|---|---|
| `--color-bg` | `#0b0b0f` | Near-black page, with a faint pixel grid `rgba(255,255,255,.05)` every 12px |
| `--color-text` | `#f2f2f2` | Body text, ≈18:1 |
| `--color-text-muted` | `#b9b9c3` | Secondary text, ≈10:1 |
| `--color-accent-hot` | `#3a5bff` | Electric blue, ≈3.8:1. **Only** for borders, large display text (≥24px), fills and the frame. Never for small text. |
| `--color-accent-hot-text` | `#7b90ff` | Small accent text, ≈6-7:1 (AA) |
| `--color-accent-bright` | `#ffd400` | Yellow, ≈13.7:1. Ink text on yellow is also fine. |
| `--color-ink` | `#0b0b0f` | Text on paper or yellow |
| `--color-paper` | `#e4e4e7` | Light-grey graph paper inside windows and cards |
| `--color-paper-grid` | `#c9c9cf` | 8px grid lines on paper |
| `--color-line` | `#2a2a33` | Dividers and hairlines |

Contrast ratios were **computed approximately**. Verify them with a contrast checker during the build.

### Type

| Token | Value |
|---|---|
| `--font-display` | "Silkscreen". Headings only. Sizes snap to multiples of 8px: 16 / 24 / 32 / 48 / 64. |
| `--font-body` | "IBM Plex Sans" 400 / 600 |
| `--font-mono` | "IBM Plex Mono" 400 |

Fonts are self-hosted via `@fontsource` (latin subset only). No Google Fonts and no CDN.

### Space, shape, motion

| Token | Value |
|---|---|
| `--space-1` .. `--space-8` | 4px base scale |
| `--border-px` | `3px` |
| `--radius` | `0` |
| `--shadow-pixel` | `4px 4px 0 var(--color-accent-bright)` |
| `--motion-step` | `steps(2)` |
| Hover timing | 120ms to open, 250ms to close |

With `prefers-reduced-motion`, all animation is off.

## 4. Page map

| Phase | Routes |
|---|---|
| 1 | `/` only, with no router |
| 2+ | `/topics/<category>`, `/topics/<category>/<slug>` (a retro OS window with a shareable URL), `/about`, 404 |
| Later | `/blog`, `/blog/<slug>`, `/office` (virtual office) |

In phase 1, menu items for routes that are not built yet render with `aria-disabled` and a "soon" label.

## 5. Components (phase 1)

Paths are under `frontend/src/`. Styling uses plain CSS modules (no Tailwind).

| File | Responsibility |
|---|---|
| `config/site.ts` | Site config: name "Mihir Kalyan", placeholder tagline, links, terminal tabs |
| `styles/tokens.css` | All design tokens (section 3) |
| `styles/global.css` | Reset, base type, page background grid, focus styles |
| `hooks/usePrefersReducedMotion.ts` | Reports whether the user prefers reduced motion |
| `hooks/useMediaQuery.ts` | Subscribes to a media query (mobile vs desktop nav) |
| `components/frame/WindowFrame` | Bordered window frame around the page |
| `components/nav/NavBar` | Slim top bar with the mega-menu triggers and the hamburger |
| `components/nav/MegaMenu` | Full-width disclosure panel for one category |
| `components/nav/MobileDrawer` | Mobile `<dialog>` drawer with a category accordion |
| `components/nav/useMenuKeyboard` | Keyboard model for the triggers and panels |
| `components/nav/MenuItemList` | Renders a category's items: live links, "soon" items, intro summary |
| `components/hero/Hero` | Hero with the h1, the pitch, the mascot and the terminal |
| `components/mascot/PixelGhost` | Animated SVG mascot |
| `components/mascot/ghostSprite.ts` | Sprite frames as string grids |
| `components/terminal/TerminalPanel` | Tabbed terminal panel |
| `components/terminal/CopyButton` | Copies a command to the clipboard |
| `components/divider/PixelDivider` | Decorative jagged divider |
| `components/footer/Footer` | Footer links |
| `content/categories.ts` | Category enum (label to slug) |
| `content/frontmatter.ts` | Frontmatter split (`---` block, CRLF and BOM safe) and safe YAML parse |
| `content/parse.ts` | Pure `parseTopics(files, { production })` and `parseIntros(files)` |
| `content/publish.ts` | Pure `publishContent(...)`: validates, then allowlist-copies only rendered fields (no body, no file path) |
| `content/site-content.d.ts` | Types for the `virtual:site-content` module |
| `content/loader.ts` | The **only** module that imports `virtual:site-content` or uses `import.meta` beyond `import.meta.url` (lint-enforced) |

Vite config (`frontend/vite.config.ts`):
- The `portfolio:site-content` plugin serves the virtual module `virtual:site-content`. It reads `content/topics/*.md` and `content/intros/*.md` in Node, runs `publishContent`, and exports only published, allowlisted fields. Markdown bodies, file paths and `yaml` never reach the browser; `yaml` is a dev dependency.
- Builds exclude drafts; the dev server and tests keep them.
- Invalid content throws `ContentError` naming the repo-relative file (for example `content/topics/x.md`), so `vite build` fails.
- In dev, adding, changing or deleting a `.md` file in `content/topics` or `content/intros` invalidates the module and triggers a full reload.
- There is no `@site-content` alias; `server.fs.allow` is the frontend root only.
- `build.modulePreload.polyfill` is `false`: the polyfill uses `fetch`, which CSP `connect-src 'none'` blocks.

Moving parsing to build time cut the JS bundle from 340.03 kB (106.63 kB gzip) to 237.53 kB (74.52 kB gzip).

## 6. Interaction specs

### Mega-menu (desktop)
- Built as a WAI-ARIA **disclosure nav**: `<nav aria-label="Main">` with button triggers that have `aria-expanded` and `aria-controls`. **Not** `role="menu"`.
- Only one panel is open at a time.
- Hover opens a panel only under `(hover: hover) and (pointer: fine)`, with a 120ms open delay and a 250ms close grace period.
- Focus alone does **not** open a panel. Enter or Space toggles it.
- ArrowDown opens the panel and focuses its first item. ArrowLeft and ArrowRight move between triggers and wrap around. Home and End jump to the first and last trigger.
- Inside a panel, ArrowUp and ArrowDown move between items.
- Esc closes the panel and returns focus to its trigger. The panel also closes when focus leaves the nav or on a pointerdown outside it.
- An empty category shows "nothing here yet".

### Mobile (< 48rem)
- The hamburger opens `MobileDrawer` as a native `<dialog>` with `showModal()`. This gives a focus trap, Esc to close and an inert background.
- The drawer shows categories as an accordion and locks page scroll while open (by setting `data-scroll-locked` on `<html>`, styled in `global.css`).
- A click on the backdrop (outside the drawer content) also closes it.
- On close, focus returns to the hamburger.

### TerminalPanel
- WAI-ARIA tabs: `software` / `cybersecurity` / `blog`.
- Roving tabindex with automatic activation. Arrow keys, Home and End move between tabs.
- Shows placeholder commands (`whoami`, `ls projects/`, `cat skills.txt`). No real hostnames.

### CopyButton
- Calls `navigator.clipboard.writeText` only from a click.
- Announces the result in an `aria-live="polite"` region: "copied" or "copy failed, press ctrl+c".
- On failure it also selects the text so the user can copy it by hand.

### PixelGhost mascot
- An original pixel robotic ghost with an antenna and a visor. It must not be a Pac-Man copy.
- Frames are 16x16 string grids. Characters: `.` transparent, `B` body, `O` outline, `V` visor, `E` eye glow, `A` antenna.
- Each row is merged into rect runs. Colours come from classes mapped to tokens.
- SVG `viewBox="0 0 16 16"` with `shape-rendering: crispEdges`.
- Animation: 2 frames (skirt wiggle, visor blink) plus a 2-step bob.
- Decorative, so it has `aria-hidden`. With reduced motion it exposes `data-motion="off"`.

### PixelDivider
- Decorative jagged divider with `aria-hidden`.

## 7. Content schema: `content/topics/<slug>.md`

This section is the single source of truth. `content/README.md` mirrors it.

**Slug:** taken from the filename. It must match `^[a-z0-9]+(-[a-z0-9]+)*$` and be unique.

**Categories (label to slug):**

| Label | Slug |
|---|---|
| Cloud | `cloud` |
| App Sec | `app-sec` |
| Network Sec | `network-sec` |
| IAM | `iam` |
| SecOps | `secops` |
| AI & Automation | `ai-automation` |
| Documentation | `documentation` |
| Projects | `projects` |
| About | `about` |

**Fields:**

| Field | Type | Rules |
|---|---|---|
| `title` | string | Required, non-empty, ≤80 chars |
| `category` | enum | Required, one of the slugs above |
| `summary` | string | Required, ≤140 chars |
| `date` | string | Required, `YYYY-MM-DD` and a real calendar date, kept as a string. Quoting is recommended; unquoted is also accepted because the YAML core schema reads it as a string. |
| `tools` | string[] | Default `[]`. Each entry non-empty, ≤64 chars |
| `screenshots` | `{ src, alt }[]` | `alt` is required, ≤200 chars |
| `video` | `{ src, title, poster? }` | Local files only. `title` required, ≤200 chars |
| `related` | string[] | Each entry ≤64 chars, is `"<category>/<slug>"` and must match a published topic. In production builds drafts are excluded first, so a link to a draft fails the build. |
| `icon` | string | Local media path, same allowlist as `src` (section 8), for example `topics/example/icon.svg` |
| `order` | number | Optional sort order |
| `url` | string | Optional. External link for the topic (for example a project repo or demo). Must pass `safeHttpsUrl` (section 8): `https:`, no username or password, a public host. When set, the menu item is a live link that opens in a new tab with `rel="noopener noreferrer"`. |
| `draft` | boolean | Default `false`. Drafts are excluded from production. |

Unknown keys are rejected. Control and bidi characters (`[\u0000-\u0008\u000B-\u001F\u007F‪-‮⁦-⁩]`) are rejected in every frontmatter string, keys included; tab and LF are allowed. An invalid file fails the build, and the error names the repo-relative file path.

### Category intros: `content/intros/<category>.md`
- Optional, one per category. The filename must be a category slug.
- Frontmatter: `title` (required, ≤80 chars), `summary` (required, ≤200 chars). The body is kept for phase 2.
- Phase 1: the summary shows at the top of that category's mega-menu panel and drawer section.
- Phase 2: it becomes the intro of the `/topics/<category>` page.
- Same parsing and validation rules as topics.

### Adding a project (no code change)
Create `content/topics/<slug>.md`:
```yaml
---
title: my cool project
category: projects
summary: one line about what it does.
date: "2026-10-13"
url: https://github.com/<you>/<repo>
---
```
It appears under Projects as a live, safe external link. Without `url` it shows as "soon" until topic pages exist in phase 2.

**Decisions (approved):**
1. **Projects.** `content/topics` with `category: projects` is the single source, plus the intro in `content/intros/projects.md`. `content/projects/` and the planned `/api/projects` are parked until phase 2.
2. **About.** About stays in the nav enum, but its column links to the `/about` page (phase 2) rather than listing topics.

## 8. Security requirements (from `wolverine`)

**Content parsing**
- Parse YAML with `yaml` v2 using the core schema and `maxAliasCount: 100`. No custom tags.
- Parsing runs in Node at build/dev time (section 5); only published, allowlisted fields reach the browser.
- Media paths (`screenshots[].src`, `video.src`, `video.poster`, `icon`) must match `^[a-z0-9][a-z0-9_-]*(\/[a-z0-9][a-z0-9_-]*)*\.(png|jpg|jpeg|webp|svg|mp4|webm)$`.
  - Paths are relative to `content/` (for example `media/burp-scan.png`).
  - The regex alone is the check: every segment starts with `[a-z0-9]`, then only `[a-z0-9_-]`, joined by single `/`. That rules out `..`, empty or `.` segments, a leading `/` or `\`, `%`, `:`, `//`, whitespace and NUL.
  - Phase 2 requirement: once paths are resolved to files, the resolved path must stay inside the content root. Nothing resolves media paths yet.
- Length caps: `title` ≤80, topic `summary` ≤140, intro `summary` ≤200, screenshot `alt` ≤200, `video.title` ≤200, each `tools` / `related` entry ≤64.
- Control and bidi characters `[\u0000-\u0008\u000B-\u001F\u007F‪-‮⁦-⁩]` are rejected in every frontmatter string, keys included. Tab and LF are allowed.
- Outbound links (the topic `url` field, and footer links in `config/site.ts`) go through `safeHttpsUrl` in `lib/safeUrl.ts` and are rendered with `rel="noopener noreferrer"`. It requires:
  - `https:`, no embedded username or password.
  - Input and normalised `href` each ≤2048 chars, no control or bidi characters (`[\u0000-\u001F\u007F‪-‮⁦-⁩]`), no leading or trailing whitespace.
  - A public host (trailing dots stripped first). Rejected: IPv4 literals (including hex/decimal forms the URL parser normalises, such as `0x7f.1`), IPv6 literals, `localhost`, single-label hosts, and hosts ending in `.local`, `.internal`, `.lan`, `.corp`, `.home.arpa` or `.localhost`. IDN/punycode hosts are allowed.
- Email goes through `safeMailto`: `^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$`, otherwise no link.
- Never use `dangerouslySetInnerHTML`. Render SVG icons through `<img>`.
- Phase 2 Markdown: use `react-markdown` without `rehype-raw`, with `skipHtml` and the default `urlTransform`.

**Lint guards** (`frontend/eslint.config.js`, all errors)
- `dangerouslySetInnerHTML` as a JSX attribute or as an object key (catches spreads and factory props).
- `createElement` / `cloneElement` calls, except `document.createElement`.
- Imports of `react/jsx-runtime` or `react/jsx-dev-runtime`.
- `style` JSX props.
- `javascript:` URLs as literal JSX attribute values (for example `href="javascript:..."`; values inside `{...}` are not matched).
- Assigning `innerHTML` / `outerHTML`; calling `insertAdjacentHTML`.
- `eval`, implied eval and `new Function` (`no-eval`, `no-implied-eval`, `no-new-func`).
- `import.meta` other than `import.meta.url`, and imports of `virtual:site-content`, outside `src/content/loader.ts`.
- `eslint-plugin-react` is not used: it does not support ESLint 10.

**Production headers**

```
Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; media-src 'self'; connect-src 'none'; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), clipboard-read=()
Strict-Transport-Security: (HSTS)
Cross-Origin-Opener-Policy: same-origin
```

`style-src 'self'` blocks `<style>` elements and literal `style=""` attributes in served HTML. React `style={...}` props are set through the CSSOM and would pass the CSP, but lint blocks them: style through CSS modules and tokens. Do not add libraries that inject `<style>` tags at runtime. This strict policy applies to the production deploy only; the Vite dev server needs a looser one for HMR.

**Dependencies**
- Pin exact versions (`save-exact`) and commit the lockfile.
- CI runs `npm ci` and `npm audit --audit-level=high`.

**Media**
- Strip EXIF from images (`exiftool -all=`) and metadata from videos (`ffmpeg -map_metadata -1`).
- Crop sensitive areas out rather than blurring them.
- Use screenshots from lab or own infrastructure only.

## 9. Accessibility

- Target WCAG 2.1 AA.
- One `h1` per page.
- Landmarks: banner, nav, main and contentinfo, plus a skip link.
- Focus states are visible, using a `--color-accent-bright` outline.
- The schema requires alt text.
- Reduced motion is respected (section 3).
- Keyboard paths are as in section 6.
- Contrast is verified for every token pair that is used.

## 10. Testing (from `colossus`)

- **Stack:** Vitest, jsdom, Testing Library, user-event, jest-dom and vitest-axe. Turn the axe `color-contrast` rule off in jsdom.
- **Style:** tests sit next to their code as `*.test.tsx`. Query by role and accessible name.
- **Mocks:** `matchMedia`, the clipboard and `dialog.showModal`.
  - Never mock `virtual:site-content`. Unit-test `parse.ts` with raw strings, and keep one integration test over the real content files (`content/loader.test.ts`).
- Export the hover-delay constants so tests can use them.

**Coverage** (enforced with thresholds):

| Scope | Lines | Branches |
|---|---|---|
| Global | 85% | 80% |
| `content/parse.ts` | 95% | 90% |

**npm scripts:** `dev`, `build` (`tsc -b && vite build`), `preview`, `test` (`vitest run`), `test:watch`, `test:coverage`, `typecheck`, `lint`.

## 11. Dependencies (phase 1, exact pins)

| Runtime | Version |
|---|---|
| `react` | 19.3.0 |
| `react-dom` | 19.3.0 |
| `@fontsource/silkscreen` | 5.3.0 |
| `@fontsource/ibm-plex-sans` | 5.3.0 |
| `@fontsource/ibm-plex-mono` | 5.3.0 |

| Dev | Version |
|---|---|
| `vite` | 8.3.4 |
| `yaml` | 2.9.1 (build-time content parsing only) |
| `@vitejs/plugin-react` | 6.1.2 |
| `typescript` | 6.0.3 (TS 7 is not supported by typescript-eslint 8.71.2) |
| `@types/react` | 19.3.0 |
| `@types/react-dom` | 19.3.0 |
| `@types/node` | 26.6.5 |
| `vitest` | 5.0.4 |
| `@vitest/coverage-v8` | must match `vitest` |
| `jsdom` | 30.1.2 |
| `@testing-library/react` | 16.3.3 |
| `@testing-library/dom` | 10.4.2 |
| `@testing-library/user-event` | 14.6.8 |
| `@testing-library/jest-dom` | 7.0.1 |
| `vitest-axe` | 0.1.0 |
| `@eslint/js` | 10.0.1 |
| `globals` | 17.13.0 |
| `eslint` | 10.12.0 |
| `typescript-eslint` | 8.71.2 |
| `eslint-plugin-react-hooks` | 7.1.1 |

**Scaffolding:** run `create-vite` into a scratch folder, then copy the files across. This keeps `frontend/README.md` from being overwritten.

## 12. Phased build plan

| Phase | Scope |
|---|---|
| 1 | Home page: frame, nav with mega-menu and drawer, hero with mascot and terminal, dividers, footer, content loader and stub topics |
| 2 | Router and prerendering, topic windows with shareable URLs, screenshots and video, `/about`, 404, `react-markdown` |
| 3 | Staggered category cards with pixel icons, a stats row with large numbers, hand-drawn doodle stickers, blog |
| 4 | Virtual office: a pixel room where the agents (Planner, Frontend, Security, DevOps, Content, QA) are clickable characters that show their role, skills and an example task |
| Ongoing | CI (lint, tests, audit) and CSP headers on the host |
