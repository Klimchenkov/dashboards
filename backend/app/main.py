from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import BuilderQuery, SaveViz
from .deps import get_db
from .builder import build_sql

app = FastAPI(title="Reporting & Viz API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"ok": True}

@app.post("/api/v1/builder/query")
async def builder_query(q: BuilderQuery, db=Depends(get_db)):
    try:
        sql, params = build_sql(q.model_dump())
    except ValueError as e:
        raise HTTPException(400, str(e))
    rows = await db.fetch(sql, *params)
    return [dict(r) for r in rows]

@app.post("/api/v1/visualizations")
async def save_viz(payload: SaveViz, db=Depends(get_db)):
    row = await db.fetchrow(
        """
        INSERT INTO public.visualizations(name, schema_json)
        VALUES ($1, $2)
        RETURNING id
        """, payload.name, payload.schema
    )
    return {"id": row["id"]}

@app.get("/api/v1/visualizations/{viz_id}")
async def get_viz(viz_id: int, db=Depends(get_db)):
    row = await db.fetchrow("SELECT id, name, schema_json FROM public.visualizations WHERE id=$1", viz_id)
    if not row:
        raise HTTPException(404, "Not found")
    return {"id": row["id"], "name": row["name"], "schema": row["schema_json"]}
