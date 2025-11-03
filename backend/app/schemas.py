from pydantic import BaseModel, Field
from typing import List, Literal, Any

class Filter(BaseModel):
    field: str
    op: Literal["=","!="," >", "<", ">=","<=","between","in","like"]
    value: Any

class Sort(BaseModel):
    field: str
    dir: Literal["asc","desc"] = "asc"

class BuilderQuery(BaseModel):
    datasetKey: str
    select: List[str] = Field(default_factory=list)
    filters: List[Filter] = Field(default_factory=list)
    groupBy: List[str] = Field(default_factory=list)
    sort: List[Sort] = Field(default_factory=list)
    limit: int = 5000
    calcFields: List[dict] = Field(default_factory=list)

class SaveViz(BaseModel):
    name: str
    schema: dict
