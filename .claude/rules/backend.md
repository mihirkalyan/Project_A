---
paths:
  - "backend/**"
---

- Use the virtualenv: `backend/.venv` (Windows: `backend/.venv/Scripts/python`). Never install packages globally.
- Add new dependencies to `requirements.txt` (runtime) or `requirements-dev.txt` (tools).
- One module per feature under `backend/app/`; keep routers thin.
- Every endpoint is listed in `docs/api-contract.md` and has a test in `backend/tests/`.
