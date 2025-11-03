# Reporting Project (Next.js + FastAPI + Postgres)
## One-command start
```bash
docker compose up -d --build
```
- Web: http://localhost:3000
- API: http://localhost:8000/health
- DB: localhost:5432 (user: postgres, pass: postgres, db: app)

Stop: `docker compose down`
Rebuild: `docker compose up -d --build`
Notes: Web uses `NEXT_PUBLIC_API_URL=http://backend:8000`
