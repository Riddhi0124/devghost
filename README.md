# DevGhost

DevGhost analyzes a GitHub repository and produces:

- security and quality findings
- issue drafts you can copy into GitHub
- patch drafts as unified diffs

## Monorepo Layout

- `web` - Next.js frontend (starter)
- `api` - FastAPI backend
- `worker` - Celery worker for async scans
- `infra` - Docker Compose and local infra helpers

## Quick Start (Local)

1. Start infrastructure:

   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```

2. Start API:

   ```bash
   cd api
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```

3. Start Worker:

   ```bash
   cd worker
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   python -m app.worker
   ```

4. Start Web:

   ```bash
   cd web
   npm install
   npm run dev
   ```

## Current Status

This is an initial scaffold with health/status endpoints and a simple scan job flow.
Next steps include repo cloning, static analysis adapters, and LLM finding enrichment.
