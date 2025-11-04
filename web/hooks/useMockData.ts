import { useMemo } from "react";
import { Filters } from "@/lib/dataModel";
import { generateMock } from "@/lib/mockData";
import { cacheGet, cacheSet } from "@/lib/cache";

export function useMockData(filters: Filters) {
  const key = JSON.stringify({ seed: filters.seed });
  return useMemo(()=> {
    const cached = cacheGet<any>(key);
    if (cached) return cached;
    const data = generateMock(filters.seed);
    cacheSet(key, data);
    return data;
  }, [key]);
}
