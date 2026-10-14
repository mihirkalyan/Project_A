# API contract

Owned by `cyclops`. Frontend (`storm`) and backend (`beast`) must follow this file; change it first, then the code.

Base path: `/api`. JSON responses. Errors: `{"detail": "<message>"}` with the matching HTTP status.

| Method | Path | Response |
|---|---|---|
| GET | `/api/health` | `{"status": "ok"}` (implemented) |
| GET | `/api/projects` | list of project summaries (planned) |
| GET | `/api/projects/{slug}` | one project with Markdown body (planned) |
| GET | `/api/posts` | list of post summaries (planned) |
| GET | `/api/posts/{slug}` | one post with Markdown body (planned) |
| GET | `/api/skills` | skills grouped by category (planned) |

Content comes from Markdown files in `content/` (see `content/README.md`).
