import { Alert } from "./dataModel";
export const Alerts = {
  overload(series:{date:string;pct:number}[], refId:number, entity:'dept'|'person'):{ return [] as Alert[]; },
  underload(series:{date:string;pct:number}[], refId:number, entity:'dept'|'person'):{ return [] as Alert[]; },
  forecastOverload(u:{forecast_load:number; forecast_confidence:number}, refId:number){ if(u.forecast_load>1.2 && u.forecast_confidence>0.7) return [{ type:'overload', severity:3, entity:'person', refId, message:'Прогнозная перегрузка через 2 месяца', from:'', to:'' }]; return []; },
  dataQuality(p:{end_date?:string; bitrix24_id?:string}, refId:number){ if(!p.end_date || !p.bitrix24_id) return [{ type:'low-quality', severity:2, entity:'project', refId, message:'Проект без даты окончания или ID Bitrix24', from:'', to:'' } as any]; return []; },
  normDeviation(u:{actual_presale:number; norm_presale:number}, refId:number){ if(Math.abs(u.actual_presale-u.norm_presale)>0.2) return [{ type:'low-quality', severity:1, entity:'person', refId, message:'Отклонение от нормы пресейл-часов >20%', from:'', to:'' }]; return []; }
}
