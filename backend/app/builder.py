from typing import Any
from .vitrine_map import DATASET_MAP, DATASET_FIELDS

SQL_OPS = {"=","!=",">","<",">=","<=","between","in","like"}

def qname(name: str) -> str:
    if not name.replace("_","").isalnum():
        raise ValueError("invalid identifier")
    return name

def build_sql(q: dict) -> tuple[str, list[Any]]:
    dataset = q["datasetKey"]
    table = DATASET_MAP.get(dataset)
    if not table:
        raise ValueError("Unknown datasetKey")

    allowed = set(DATASET_FIELDS.get(dataset, []))
    if q.get("select"):
        for c in q["select"]:
            if c not in allowed:
                raise ValueError(f"Field not allowed: {c}")
    cols = ", ".join(q.get("select") or list(allowed))

    where_clauses, params = ["1=1"], []
    for f in q.get("filters", []):
        if f["field"] not in allowed or f["op"] not in SQL_OPS:
            raise ValueError("Invalid filter")
        field = qname(f["field"])
        op = f["op"].lower()
        if op == "between":
            where_clauses.append(f"{field} BETWEEN ${len(params)+1} AND ${len(params)+2}")
            params.extend(f["value"])
        elif op == "in":
            vals = f["value"]
            placeholders = ",".join([f"${len(params)+i+1}" for i in range(len(vals))])
            where_clauses.append(f"{field} IN ({placeholders})")
            params.extend(vals)
        elif op == "like":
            where_clauses.append(f"{field} LIKE ${len(params)+1}")
            params.append(f["value"])
        else:
            where_clauses.append(f"{field} {op} ${len(params)+1}")
            params.append(f["value"])

    group_by = q.get("groupBy", [])
    for g in group_by:
        if g not in allowed:
            raise ValueError("Invalid groupBy")
    group_sql = f" GROUP BY {', '.join(map(qname, group_by))}" if group_by else ""

    sort_sql = ""
    if q.get("sort"):
        parts = []
        for s in q["sort"]:
            if s["field"] not in allowed:
                raise ValueError("Invalid sort field")
            parts.append(f"{qname(s['field'])} {s['dir'].upper()}")
        sort_sql = " ORDER BY " + ", ".join(parts)

    limit = int(q.get("limit", 5000))
    sql = f"SELECT {cols} FROM {table} WHERE {' AND '.join(where_clauses)}{group_sql}{sort_sql} LIMIT {limit}"
    return sql, params
