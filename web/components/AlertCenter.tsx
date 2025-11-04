'use client';
import { Card } from "./ui";
import { Alert } from "@/lib/dataModel";

export default function AlertCenter({ alerts }:{ alerts: Alert[] }){
  return (
    <Card className="space-y-2">
      <div className="font-semibold">Alert Center</div>
      <div className="grid md:grid-cols-2 gap-2">
        {alerts.map((a,idx)=> (
          <div key={idx} className="border rounded-xl p-3">
            <div className="text-sm opacity-70">{a.type.toUpperCase()} · sev{a.severity}</div>
            <div className="font-medium">{a.message}</div>
            <div className="text-xs opacity-70">{a.from} → {a.to}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
