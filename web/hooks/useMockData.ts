import { useMemo } from "react";
import { Filters } from "@/lib/dataModel";
import { generateMock } from "@/lib/mockData";
import { cacheGet, cacheSet } from "@/lib/cache";
export function useMockData(filters: Filters){
  const key = JSON.stringify({ seed: filters.seed });
  return useMemo(()=>{ const c=cacheGet<any>(key); if(c) return c; const d=generateMock(filters.seed); cacheSet(key,d); return d; }, [key]);
}
