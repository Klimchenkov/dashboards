'use client'
import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, Bar, BarChart, Line, LineChart } from 'recharts'

export function VizRenderer({ type, data, x, y }: { type: string; data: any[]; x?: string; y?: string[] }) {
  if (type === 'kpi') {
    const value = data?.[data.length-1]?.[y?.[0] || 'value'] ?? 0;
    return <div className="text-3xl font-bold">{value}</div>
  }
  if (type === 'bar' || type === 'stacked_bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={x} /><YAxis /><Tooltip /><Legend />
          {(y||[]).map((k) => <Bar key={k} dataKey={k} stackId={type==='stacked_bar'? 'a': undefined} />)}
        </BarChart>
      </ResponsiveContainer>
    )
  }
  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={x} /><YAxis /><Tooltip /><Legend />
          {(y||[]).map((k) => <Line key={k} dataKey={k} type="monotone" />)}
        </LineChart>
      </ResponsiveContainer>
    )
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={x} /><YAxis /><Tooltip /><Legend />
        {(y||[]).map((k) => <Area key={k} dataKey={k} type="monotone" />)}
      </AreaChart>
    </ResponsiveContainer>
  )
}
