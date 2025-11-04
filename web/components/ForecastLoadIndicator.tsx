'use client';
export default function ForecastLoadIndicator({ currentLoad, forecastLoad, timeframe }:{ currentLoad:number; forecastLoad:number; timeframe:string }){
  const delta = (forecastLoad-currentLoad)*100;
  const col = delta>10 ? 'text-red-600' : delta<-10 ? 'text-green-600' : 'text-neutral-700';
  return <span className={col}>{forecastLoad.toFixed(2)}× <span className="opacity-60 text-xs">({timeframe})</span></span>;
}
