# Content

Add content by adding files. No code changes are needed.

The repo is public: never put secrets, client names, internal hostnames or IPs in content.

## Topics (`content/topics/`)

One topic per file: `content/topics/<slug>.md`. The frontend parses these files at build time (dev server: on every add, change or delete). Only published frontmatter fields reach the browser: no Markdown body, no file path, and no drafts in builds. The full schema and validation rules are in `docs/design-brief.md` (sections 7 and 8), which is the source of truth.

- **Slug:** the filename. It must match `^[a-z0-9]+(-[a-z0-9]+)*$` and be unique.
- **Category slugs:** `cloud`, `app-sec`, `network-sec`, `iam`, `secops`, `ai-automation`, `documentation`, `projects`, `about`.
- **Length caps:** `title` 80, `summary` 140, screenshot `alt` 200, `video.title` 200, each `tools` / `related` entry 64.
- Control and bidi-override characters are rejected in every value and key; tab and newline are fine.
- Unknown keys are rejected. An invalid file fails the build, and the error names the file (for example `content/topics/x.md`).

```yaml
---
title: Example topic          # required, max 80 characters
category: app-sec             # required, a category slug
summary: One line, max 140 characters.   # required
date: "2026-01-01"            # required, YYYY-MM-DD, real date; quoting recommended
tools: [burp, python]         # optional, default []
screenshots:                  # optional; alt is required
  - src: topics/example/shot-1.png
    alt: What the screenshot shows
video:                        # optional, local file only
  src: topics/example/demo.mp4
  title: Demo
  poster: topics/example/poster.png
related: [cloud/other-topic]  # optional, must be a published topic
icon: topics/example/icon.svg # optional, local media path (see Media paths)
order: 1                      # optional
url: https://example.com/repo # optional, https only, no user:pass@, public host
draft: false                  # optional; drafts are not published
---
Markdown body here.
```

`url` (optional): an external link, such as a project repo or demo.
- Must parse as a URL, use `https:`, contain no username or password, be at most 2048 characters (also after normalising), and contain no control characters, bidi-override characters or leading/trailing whitespace. Anything else fails the build.
- Don't link internal or private hosts; the build rejects them. That means IP addresses (IPv4 in any form, IPv6), `localhost`, single-label hosts, and hosts ending in `.local`, `.internal`, `.lan`, `.corp`, `.home.arpa` or `.localhost`. International (punycode) domains are fine.
- When set, the menu item becomes a live link that opens in a new tab with `rel="noopener noreferrer"`.

`related` (optional): each entry is `<category>/<slug>` and must match a published topic. In production builds drafts are not published, so a link to a draft fails the build.

`date`: unquoted `2026-01-01` is also accepted (read as a string), but quoting is recommended.

Media paths (`screenshots[].src`, `video.src`, `video.poster`, `icon`):
- Relative to `content/` and must match `^[a-z0-9][a-z0-9_-]*(\/[a-z0-9][a-z0-9_-]*)*\.(png|jpg|jpeg|webp|svg|mp4|webm)$`.
- So: lowercase, every `/`-separated segment starts with a letter or digit and then uses only letters, digits, `_` or `-`, and the file has one of the allowed extensions.
- That rules out `..`, `//`, `%`, `:`, `\`, NUL, whitespace, a leading `/`, and empty or `.` path segments.
- Strip metadata before committing (`exiftool -all=`, `ffmpeg -map_metadata -1`).

## Category intros (`content/intros/`)

Optional, one per category: `content/intros/<category>.md`. The filename must be a category slug.

```yaml
---
title: projects      # required, max 80 characters
summary: One line, max 200 characters.   # required
---
Body text (kept for phase 2).
```

- Phase 1: the summary shows at the top of that category's mega-menu panel and drawer section.
- Phase 2: it becomes the intro of the `/topics/<category>` page.
- Same parsing and validation rules as topics.

## Adding a project (no code change)

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

## Parked: projects, posts and skills (not read by the site)

> Parked until phase 2 or later. Nothing in this section is read by the frontend today, and it does **not** apply to `content/topics/`. Projects live in `content/topics/` with `category: projects` (see above); `content/projects/` and `/api/projects` are not used in phase 1.

- `projects/<slug>.md`: one project per file (parked)
- `posts/<slug>.md`: one blog post per file (parked, blog is phase 3)
- `skills.yaml`: skills by category (parked)

Legacy frontmatter draft for these parked files (not validated by anything yet; `tags` and `links` are not valid topic keys):

```yaml
---
title: Example title
date: "2026-01-01"
summary: One-line summary shown on cards.
tags: [software]        # or [cybersecurity]
links:
  - label: GitHub
    url: https://github.com/...
draft: false
---
Markdown body here.
```
