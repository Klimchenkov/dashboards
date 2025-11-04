'use client';
export default function NormComplianceBadge({ commercial, presale, internal, preset }:{ commercial:number; presale:number; internal:number; preset?:string }){
  const total = commercial + presale + internal || 1;
  const dist = { c: commercial/total, p: presale/total, i: internal/total };
  const score = 1 - Math.abs(dist.c-0.75)/3 - Math.abs(dist.p-0.15)/3 - Math.abs(dist.i-0.10)/3;
  return <span className="px-2 py-1 rounded-xl bg-neutral-100">{(score*100).toFixed(0)}%</span>;
}
