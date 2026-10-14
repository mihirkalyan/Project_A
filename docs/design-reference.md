# Design reference: Hermes Agent landing page

Studied from https://hermes-agent.nousresearch.com/ as **inspiration only**. Build our own implementation. Do not copy their text, logo, images or fonts (the site uses the licensed Aeonik Fono and Rules typefaces).

## Our direction

The approved direction is in `docs/design-brief.md`: a dark page, the "Electric" palette and a retro pixel-art identity. The earlier "light paper" direction is dropped. From Hermes we take only the cues: bold full-bleed colour, square corners, a tabbed terminal panel and numbered cards.

## Structure (top to bottom)
1. Top nav: text links on the left, icon links (GitHub, etc.) on the right. Sticky on mobile.
2. Hero: big two-line headline, primary and secondary buttons, an install-style command panel with OS tabs and a copy button, and a full-width image.
3. Feature grid: six numbered cards, one sentence each.
4. FAQ accordion.
5. Pricing tiers (not needed for us).
6. Footer: brand, link columns, socials and license.

## Mapping to our portfolio
| Their section | Our section |
|---|---|
| Hero + install panel | Hero with name, one-line pitch, and a terminal-style panel (tabs: software / cybersecurity / blog) |
| Feature grid #1 to #6 | Skills and featured projects as numbered cards |
| FAQ | "About me" Q&A |
| Footer | Links (GitHub, LinkedIn, email) |

## Tech
They use Next.js. We use React + Vite (frontend) and FastAPI (backend). See `docs/design-brief.md` for the stack decision.
